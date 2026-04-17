from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from pathlib import Path
from typing import Any

import anthropic

logger = logging.getLogger(__name__)

MODEL = "claude-opus-4-7"
MAX_TOKENS = 4096

MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".gif": "image/gif",
}

# USD per 1M tokens (Opus-class pricing). Multiply by EUR conversion.
USD_IN_PER_MTOK = 5.0
USD_OUT_PER_MTOK = 25.0
USD_TO_EUR = 0.92


def estimar_coste_eur(input_tokens: int, output_tokens: int) -> float:
    usd = (input_tokens * USD_IN_PER_MTOK + output_tokens * USD_OUT_PER_MTOK) / 1_000_000
    return round(usd * USD_TO_EUR, 6)


class ClaudeService:
    """Wrapper around the Anthropic client to extract albaran data."""

    def __init__(self, api_key: str, prompt_path: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = MODEL
        with open(prompt_path, "r", encoding="utf-8") as f:
            self.system_prompt = f.read()

    def _build_content(self, ruta_archivo: str) -> tuple[list[dict], str]:
        ext = Path(ruta_archivo).suffix.lower()
        media_type = MIME_MAP.get(ext)
        if not media_type:
            raise ValueError(f"Formato no soportado: {ext}")
        with open(ruta_archivo, "rb") as f:
            datos_b64 = base64.standard_b64encode(f.read()).decode("utf-8")

        content_type = "document" if ext == ".pdf" else "image"
        content = [
            {
                "type": content_type,
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": datos_b64,
                },
            },
            {
                "type": "text",
                "text": "Analiza este albarán y devuelve el JSON según las reglas del sistema. Solo el JSON.",
            },
        ]
        return content, ext

    def _call_with_retries(self, messages: list[dict]) -> Any:
        for attempt in range(3):
            try:
                return self.client.messages.create(
                    model=self.model,
                    max_tokens=MAX_TOKENS,
                    system=self.system_prompt,
                    messages=messages,
                )
            except anthropic.RateLimitError:
                logger.warning("Rate limit (429), retry in 5s (attempt %s)", attempt + 1)
                time.sleep(5)
            except anthropic.APIStatusError as e:
                status = getattr(e, "status_code", None)
                if status == 529:
                    logger.warning("Overloaded (529), retry in 10s (attempt %s)", attempt + 1)
                    time.sleep(10)
                else:
                    raise
        raise RuntimeError("Claude API retry budget exhausted")

    @staticmethod
    def _strip_fences(texto: str) -> str:
        texto = texto.strip()
        if texto.startswith("```"):
            # drop first line (```json or ```)
            _, _, rest = texto.partition("\n")
            if rest.endswith("```"):
                rest = rest[: -3]
            elif "\n```" in rest:
                rest = rest.rsplit("\n```", 1)[0]
            texto = rest.strip()
        return texto

    def analizar_albaran(self, ruta_archivo: str) -> dict:
        """Sync extraction — call from a thread when in async context."""
        content, _ext = self._build_content(ruta_archivo)
        messages: list[dict] = [{"role": "user", "content": content}]
        response = self._call_with_retries(messages)

        usage = getattr(response, "usage", None)
        input_tokens = getattr(usage, "input_tokens", 0) if usage else 0
        output_tokens = getattr(usage, "output_tokens", 0) if usage else 0

        texto = self._strip_fences(response.content[0].text)
        try:
            data = json.loads(texto)
        except json.JSONDecodeError:
            # Retry once asking for strictly-valid JSON
            logger.warning("First JSON parse failed, retrying with reformat request")
            messages.append({"role": "assistant", "content": texto})
            messages.append(
                {
                    "role": "user",
                    "content": "La respuesta anterior no es JSON válido. Devuelve EXCLUSIVAMENTE el objeto JSON, sin markdown ni texto adicional.",
                }
            )
            response = self._call_with_retries(messages)
            usage = getattr(response, "usage", None)
            input_tokens += getattr(usage, "input_tokens", 0) if usage else 0
            output_tokens += getattr(usage, "output_tokens", 0) if usage else 0
            texto = self._strip_fences(response.content[0].text)
            try:
                data = json.loads(texto)
            except json.JSONDecodeError:
                logger.error("JSON parse failed twice; returning ilegible payload")
                data = {
                    "pagina_ilegible": True,
                    "motivo": "json_parse_error",
                }

        data["_meta"] = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "coste_eur": estimar_coste_eur(input_tokens, output_tokens),
            "model": self.model,
        }
        return data

    async def analizar_albaran_async(self, ruta_archivo: str) -> dict:
        return await asyncio.to_thread(self.analizar_albaran, ruta_archivo)
