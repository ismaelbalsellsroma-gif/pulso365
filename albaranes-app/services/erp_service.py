from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class ErpService:
    def __init__(self, webhook_url: str | None, api_key: str | None):
        self.webhook_url = webhook_url
        self.api_key = api_key

    @property
    def configured(self) -> bool:
        return bool(self.webhook_url)

    @property
    def insecure(self) -> bool:
        return bool(self.webhook_url) and self.webhook_url.startswith("http://")

    async def send(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.webhook_url:
            raise RuntimeError("ERP_WEBHOOK_URL no configurado")
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-Api-Key"] = self.api_key
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(self.webhook_url, json=payload, headers=headers)
            r.raise_for_status()
            try:
                body = r.json()
            except ValueError:
                body = {"text": r.text}
        return {"status": r.status_code, "body": body}
