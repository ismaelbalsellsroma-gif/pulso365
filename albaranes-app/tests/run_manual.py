"""
Manual smoke test: process every file under tests/fixtures/ with the real
Claude API and print a summary.  Requires ANTHROPIC_API_KEY in your env.

    python tests/run_manual.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(BASE / ".env")

from services.claude_service import ClaudeService  # noqa: E402
from models.albaran import clasificar_pila  # noqa: E402


def main():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY no configurada; aborta.", file=sys.stderr)
        sys.exit(1)

    prompt_path = BASE / "prompts" / "prompt_extraccion.txt"
    svc = ClaudeService(api_key=api_key, prompt_path=str(prompt_path))

    fixtures_dir = BASE / "tests" / "fixtures"
    files = sorted(
        p for p in fixtures_dir.iterdir()
        if p.suffix.lower() in {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"}
    )
    if not files:
        print(f"No hay fixtures en {fixtures_dir}. Añade 5-10 albaranes.")
        return

    total_tokens_in = 0
    total_tokens_out = 0
    total_coste = 0.0
    counts = {"listos": 0, "revisar": 0, "problemas": 0}
    for f in files:
        print(f"→ {f.name}")
        try:
            data = svc.analizar_albaran(str(f))
        except Exception as e:  # noqa: BLE001
            print(f"   ERROR: {e}")
            counts["problemas"] += 1
            continue
        meta = data.get("_meta", {})
        total_tokens_in += meta.get("input_tokens", 0)
        total_tokens_out += meta.get("output_tokens", 0)
        total_coste += meta.get("coste_eur", 0.0)
        pila = clasificar_pila(data)
        counts[pila] += 1
        if pila == "problemas":
            print(f"   PROBLEMA: {data.get('motivo')}")
        else:
            conf = (data.get("confianza") or {})
            alb = (data.get("albaran") or {})
            prov = (data.get("proveedor") or {})
            tot = (data.get("totales") or {})
            print(
                f"   {pila.upper()} · {alb.get('numero')} · {prov.get('nombre')} "
                f"· total {tot.get('total')} · conf {conf.get('global')}/{conf.get('puntuacion_0_100')}"
            )

    print("\n" + "=" * 60)
    print(f"Procesados: {len(files)}")
    print(f"  Listos:    {counts['listos']}")
    print(f"  Revisar:   {counts['revisar']}")
    print(f"  Problemas: {counts['problemas']}")
    print(f"Tokens in/out: {total_tokens_in} / {total_tokens_out}")
    print(f"Coste estimado: {total_coste:.4f} €")


if __name__ == "__main__":
    main()
