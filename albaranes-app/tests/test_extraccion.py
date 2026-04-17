"""
Unit tests. They run without calling the real Claude API by monkeypatching the
service with fixture JSON payloads. Run:  pytest tests/
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import pytest  # noqa: F401
except ImportError:  # Let the module run standalone without pytest installed
    pass

from db.database import Database  # noqa: E402
from models.albaran import AlbaranExtraido, clasificar_pila  # noqa: E402


FIXTURES = Path(__file__).parent / "fixtures"


# --- Fixture builders ---------------------------------------------------------


def albaran_limpio() -> dict:
    return {
        "pagina_ilegible": False,
        "albaran": {"numero": "A-001", "fecha": "2026-04-17", "serie": "A"},
        "proveedor": {
            "nombre": "Distribuciones Ejemplo SL",
            "cif_nif": "B12345678",
            "direccion": "C/ Falsa 123",
            "codigo_postal": "08001",
            "poblacion": "Barcelona",
        },
        "cliente": {"nombre": "Restaurante Demo", "cif_nif": "B87654321"},
        "lineas": [
            {
                "posicion": 1,
                "tipo_linea": "producto",
                "descripcion": "Tomate pera",
                "cantidad": 10,
                "unidad": "kg",
                "precio_unitario": 1.20,
                "descuento_pct": 0,
                "importe_linea": 12.00,
                "iva_pct": 10,
            },
        ],
        "desglose_iva": [{"iva_pct": 10, "base": 12.00, "importe_iva": 1.20}],
        "totales": {
            "importe_bruto": 12.00,
            "descuento_global": 0,
            "base_imponible": 12.00,
            "iva_importe": 1.20,
            "total": 13.20,
        },
        "verificaciones": {
            "lineas_cuadran": True,
            "totales_cuadran": True,
            "precios_con_iva_incluido": False,
            "multi_iva": False,
        },
        "confianza": {"global": "alta", "puntuacion_0_100": 96, "campos_dudosos": []},
    }


def albaran_iva_incluido() -> dict:
    d = albaran_limpio()
    d["lineas"][0]["importe_linea"] = 13.20  # Looks like IVA included
    d["verificaciones"]["precios_con_iva_incluido"] = True
    d["observaciones_sistema"] = "precios con IVA incluido detectado"
    d["confianza"]["global"] = "alta"
    return d


def albaran_multi_iva() -> dict:
    return {
        **albaran_limpio(),
        "lineas": [
            {"posicion": 1, "tipo_linea": "producto", "descripcion": "Pan", "cantidad": 5, "precio_unitario": 1, "descuento_pct": 0, "importe_linea": 5, "iva_pct": 4},
            {"posicion": 2, "tipo_linea": "producto", "descripcion": "Refresco", "cantidad": 10, "precio_unitario": 2, "descuento_pct": 0, "importe_linea": 20, "iva_pct": 10},
        ],
        "desglose_iva": [
            {"iva_pct": 4, "base": 5, "importe_iva": 0.2},
            {"iva_pct": 10, "base": 20, "importe_iva": 2.0},
        ],
        "totales": {"importe_bruto": 25, "descuento_global": 0, "base_imponible": 25, "iva_importe": 2.2, "total": 27.2},
        "verificaciones": {"lineas_cuadran": True, "totales_cuadran": True, "precios_con_iva_incluido": False, "multi_iva": True},
    }


def pagina_ilegible() -> dict:
    return {"pagina_ilegible": True, "motivo": "página en blanco"}


# --- Tests --------------------------------------------------------------------


def test_albaran_limpio_confianza_alta():
    data = albaran_limpio()
    assert AlbaranExtraido.model_validate(data).confianza.global_ == "alta"
    assert clasificar_pila(data) == "listos"


def test_precio_iva_incluido_no_es_error():
    data = albaran_iva_incluido()
    assert data["verificaciones"]["precios_con_iva_incluido"] is True
    assert data["observaciones_sistema"]
    # Still "alta" because the provider explained it
    assert clasificar_pila(data) == "listos"


def test_pagina_ilegible_va_a_problemas():
    data = pagina_ilegible()
    assert clasificar_pila(data) == "problemas"
    parsed = AlbaranExtraido.model_validate(data)
    assert parsed.pagina_ilegible is True


def test_multi_iva_se_separa():
    data = albaran_multi_iva()
    parsed = AlbaranExtraido.model_validate(data)
    assert parsed.verificaciones.multi_iva is True
    assert len(parsed.desglose_iva) == 2
    assert {d.iva_pct for d in parsed.desglose_iva} == {4, 10}


def test_duplicado_detectado(tmp_path):
    async def run():
        db = Database(str(tmp_path / "test.db"))
        await db.init()
        row = {
            "nombre_archivo": "x.pdf",
            "archivo_hash": "abc123",
            "proveedor_nombre": None,
            "proveedor_cif": None,
            "albaran_numero": None,
            "albaran_fecha": None,
            "total_eur": None,
            "confianza": None,
            "puntuacion": None,
            "requirio_revision": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "coste_eur": 0,
            "json_original": "{}",
            "json_corregido": None,
            "enviado_erp": 0,
        }
        await db.insert(row)
        found = await db.find_by_hash("abc123")
        assert found is not None
        assert found["archivo_hash"] == "abc123"

    asyncio.run(run())


def test_clasificacion_media_va_a_revisar():
    data = albaran_limpio()
    data["confianza"]["global"] = "media"
    assert clasificar_pila(data) == "revisar"


if __name__ == "__main__":
    # Quick smoke check without pytest
    for fn in (
        test_albaran_limpio_confianza_alta,
        test_precio_iva_incluido_no_es_error,
        test_pagina_ilegible_va_a_problemas,
        test_multi_iva_se_separa,
        test_clasificacion_media_va_a_revisar,
    ):
        fn()
        print(f"OK  {fn.__name__}")
    print("All synchronous tests passed.")
