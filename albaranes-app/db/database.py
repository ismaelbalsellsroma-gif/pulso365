from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable, Optional

import aiosqlite

SCHEMA = """
CREATE TABLE IF NOT EXISTS albaranes_procesados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_procesamiento DATETIME DEFAULT CURRENT_TIMESTAMP,
    nombre_archivo TEXT NOT NULL,
    archivo_hash TEXT,
    proveedor_nombre TEXT,
    proveedor_cif TEXT,
    albaran_numero TEXT,
    albaran_fecha DATE,
    total_eur REAL,
    confianza TEXT,
    puntuacion INTEGER,
    requirio_revision INTEGER DEFAULT 0,
    input_tokens INTEGER,
    output_tokens INTEGER,
    coste_eur REAL,
    json_original TEXT,
    json_corregido TEXT,
    enviado_erp INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_fecha ON albaranes_procesados(fecha_procesamiento);
CREATE INDEX IF NOT EXISTS idx_proveedor ON albaranes_procesados(proveedor_cif);
CREATE INDEX IF NOT EXISTS idx_hash ON albaranes_procesados(archivo_hash);
"""


class Database:
    def __init__(self, path: str):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)

    async def init(self) -> None:
        async with aiosqlite.connect(self.path) as db:
            await db.executescript(SCHEMA)
            await db.commit()

    async def find_by_hash(self, archivo_hash: str) -> Optional[dict]:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT * FROM albaranes_procesados WHERE archivo_hash = ? ORDER BY id DESC LIMIT 1",
                (archivo_hash,),
            )
            row = await cur.fetchone()
            return dict(row) if row else None

    async def insert(self, data: dict) -> int:
        cols = (
            "nombre_archivo",
            "archivo_hash",
            "proveedor_nombre",
            "proveedor_cif",
            "albaran_numero",
            "albaran_fecha",
            "total_eur",
            "confianza",
            "puntuacion",
            "requirio_revision",
            "input_tokens",
            "output_tokens",
            "coste_eur",
            "json_original",
            "json_corregido",
            "enviado_erp",
        )
        values = tuple(data.get(c) for c in cols)
        placeholders = ",".join(["?"] * len(cols))
        async with aiosqlite.connect(self.path) as db:
            cur = await db.execute(
                f"INSERT INTO albaranes_procesados ({','.join(cols)}) VALUES ({placeholders})",
                values,
            )
            await db.commit()
            return cur.lastrowid or 0

    async def update_corregido(self, row_id: int, json_corregido: dict) -> None:
        async with aiosqlite.connect(self.path) as db:
            await db.execute(
                "UPDATE albaranes_procesados SET json_corregido = ?, requirio_revision = 1 WHERE id = ?",
                (json.dumps(json_corregido, ensure_ascii=False), row_id),
            )
            await db.commit()

    async def mark_enviado(self, ids: Iterable[int]) -> None:
        async with aiosqlite.connect(self.path) as db:
            await db.executemany(
                "UPDATE albaranes_procesados SET enviado_erp = 1 WHERE id = ?",
                [(i,) for i in ids],
            )
            await db.commit()

    async def list_historico(self, limit: int = 200) -> list[dict]:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT id, fecha_procesamiento, nombre_archivo, proveedor_nombre, albaran_numero, "
                "albaran_fecha, total_eur, confianza, puntuacion, requirio_revision, coste_eur, enviado_erp "
                "FROM albaranes_procesados ORDER BY id DESC LIMIT ?",
                (limit,),
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

    async def stats(self) -> dict[str, Any]:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT COUNT(*) AS n, "
                "COALESCE(SUM(input_tokens),0) AS in_tok, "
                "COALESCE(SUM(output_tokens),0) AS out_tok, "
                "COALESCE(SUM(coste_eur),0) AS coste, "
                "COALESCE(SUM(CASE WHEN requirio_revision=1 THEN 1 ELSE 0 END),0) AS revisados "
                "FROM albaranes_procesados"
            )
            row = await cur.fetchone()
            return dict(row) if row else {}

    async def get(self, row_id: int) -> Optional[dict]:
        async with aiosqlite.connect(self.path) as db:
            db.row_factory = aiosqlite.Row
            cur = await db.execute(
                "SELECT * FROM albaranes_procesados WHERE id = ?", (row_id,)
            )
            row = await cur.fetchone()
            return dict(row) if row else None
