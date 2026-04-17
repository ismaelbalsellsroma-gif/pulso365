from __future__ import annotations

import asyncio
import datetime as dt
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from db.database import Database
from models.albaran import AlbaranExtraido, clasificar_pila
from services.claude_service import ClaudeService
from services.erp_service import ErpService
from services.file_service import FileService

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "db" / "albaranes.db"))
UPLOADS_PATH = os.getenv("UPLOADS_PATH", str(BASE_DIR / "uploads"))
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
PROMPT_PATH = BASE_DIR / "prompts" / "prompt_extraccion.txt"

MAX_FILES_PER_BATCH = 20
MAX_BYTES = 10 * 1024 * 1024

db = Database(DATABASE_PATH)
file_service = FileService(UPLOADS_PATH, str(STATIC_DIR))
erp_service = ErpService(
    webhook_url=os.getenv("ERP_WEBHOOK_URL") or None,
    api_key=os.getenv("ERP_API_KEY") or None,
)

_api_key = os.getenv("ANTHROPIC_API_KEY")
if not _api_key:
    logger.warning(
        "ANTHROPIC_API_KEY no configurada — las llamadas a Claude fallarán hasta que la configures."
    )
claude_service: ClaudeService | None = None
if _api_key:
    claude_service = ClaudeService(api_key=_api_key, prompt_path=str(PROMPT_PATH))

# In-memory session store. Keyed by session_id, holds extraction results while
# the user reviews/exports. SQLite persists anything definitive.
SESSIONS: dict[str, dict[str, Any]] = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.init()
    yield


app = FastAPI(title="Procesador de Albaranes", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


def _require_claude() -> ClaudeService:
    if claude_service is None:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY no configurada. Copia .env.example a .env y añade tu clave.",
        )
    return claude_service


def _new_session() -> str:
    sid = uuid.uuid4().hex
    SESSIONS[sid] = {
        "created": dt.datetime.utcnow().isoformat(),
        "items": [],
        "coste_eur": 0.0,
    }
    return sid


def _get_session(sid: str) -> dict[str, Any]:
    session = SESSIONS.get(sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return session


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "erp_configured": erp_service.configured,
            "erp_insecure": erp_service.insecure,
        },
    )


@app.get("/resultados/{session_id}", response_class=HTMLResponse)
async def resultados_page(request: Request, session_id: str):
    session = _get_session(session_id)
    listos, revisar, problemas = [], [], []
    for item in session["items"]:
        pila = item["pila"]
        if pila == "listos":
            listos.append(item)
        elif pila == "revisar":
            revisar.append(item)
        else:
            problemas.append(item)
    return templates.TemplateResponse(
        request,
        "resultados.html",
        {
            "session_id": session_id,
            "listos": listos,
            "revisar": revisar,
            "problemas": problemas,
            "coste_eur": session.get("coste_eur", 0.0),
        },
    )


@app.get("/revision/{session_id}/{item_id}", response_class=HTMLResponse)
async def revision_page(request: Request, session_id: str, item_id: str):
    session = _get_session(session_id)
    items_revisar = [i for i in session["items"] if i["pila"] == "revisar" and not i.get("descartado")]
    idx = next((n for n, i in enumerate(items_revisar) if i["id"] == item_id), None)
    if idx is None:
        return templates.TemplateResponse(
            request,
            "revision.html",
            {
                "session_id": session_id,
                "item": None,
                "index": 0,
                "total": len(items_revisar),
                "next_id": None,
            },
        )
    item = items_revisar[idx]
    next_id = items_revisar[idx + 1]["id"] if idx + 1 < len(items_revisar) else None
    return templates.TemplateResponse(
        request,
        "revision.html",
        {
            "session_id": session_id,
            "item": item,
            "index": idx + 1,
            "total": len(items_revisar),
            "next_id": next_id,
        },
    )


@app.get("/resumen/{session_id}", response_class=HTMLResponse)
async def resumen_page(request: Request, session_id: str):
    session = _get_session(session_id)
    payload = _build_export_payload(session)
    return templates.TemplateResponse(
        request,
        "resumen.html",
        {
            "session_id": session_id,
            "metadata": payload["metadata"],
            "albaranes": payload["albaranes"],
            "erp_configured": erp_service.configured,
        },
    )


@app.get("/historico", response_class=HTMLResponse)
async def historico_page(request: Request):
    rows = await db.list_historico(limit=500)
    stats = await db.stats()
    return templates.TemplateResponse(
        request,
        "historico.html",
        {"rows": rows, "stats": stats},
    )


# ---------------------------------------------------------------------------
# JSON API
# ---------------------------------------------------------------------------


@app.post("/api/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(400, "No se recibieron archivos")
    if len(files) > MAX_FILES_PER_BATCH:
        raise HTTPException(400, f"Máximo {MAX_FILES_PER_BATCH} archivos por lote")

    sid = _new_session()
    session = SESSIONS[sid]
    saved: list[dict] = []
    for up in files:
        raw = await up.read()
        if len(raw) > MAX_BYTES:
            saved.append(
                {
                    "id": uuid.uuid4().hex,
                    "original_filename": up.filename,
                    "pila": "problemas",
                    "error": "Archivo supera 10 MB",
                    "data": {"pagina_ilegible": True, "motivo": "tamano_excedido"},
                }
            )
            continue
        try:
            file_service.validate(up.filename or "", up.content_type, len(raw))
        except ValueError as e:
            saved.append(
                {
                    "id": uuid.uuid4().hex,
                    "original_filename": up.filename,
                    "pila": "problemas",
                    "error": str(e),
                    "data": {"pagina_ilegible": True, "motivo": str(e)},
                }
            )
            continue
        info = file_service.save_upload(raw, up.filename or "albaran")
        # Duplicate check against historic records
        duplicate = await db.find_by_hash(info["hash"])
        saved.append(
            {
                "id": info["id"],
                "original_filename": info["original_filename"],
                "stored_path": info["path"],
                "static_url": info["static_url"],
                "ext": info["ext"],
                "hash": info["hash"],
                "size": info["size"],
                "duplicate_of": duplicate["id"] if duplicate else None,
                "duplicate_fecha": duplicate["fecha_procesamiento"] if duplicate else None,
                "status": "uploaded",
            }
        )
    session["items"] = saved
    return {"session_id": sid, "items": saved}


@app.post("/api/procesar/{session_id}")
async def procesar(session_id: str, request: Request):
    session = _get_session(session_id)
    body = await request.json() if await _has_body(request) else {}
    reprocess_duplicates: bool = bool(body.get("reprocess_duplicates", False))

    claude = _require_claude()

    tareas = []
    for item in session["items"]:
        if item.get("status") != "uploaded":
            continue
        if item.get("duplicate_of") and not reprocess_duplicates:
            item["pila"] = "problemas"
            item["data"] = {
                "pagina_ilegible": True,
                "motivo": f"duplicado de albarán id={item['duplicate_of']} ({item.get('duplicate_fecha')})",
            }
            item["status"] = "duplicate"
            continue
        tareas.append(_procesar_item(claude, item))

    # Process a few in parallel but not all at once (keeps rate limit happy)
    if tareas:
        sem = asyncio.Semaphore(3)

        async def run(t):
            async with sem:
                return await t

        await asyncio.gather(*(run(t) for t in tareas))

    # Persist to SQLite
    total_coste = 0.0
    for item in session["items"]:
        data = item.get("data", {})
        meta = data.get("_meta", {}) if isinstance(data, dict) else {}
        coste = meta.get("coste_eur", 0.0)
        total_coste += coste or 0.0
        if item.get("db_id"):
            continue
        try:
            total_eur = (data.get("totales") or {}).get("total") if isinstance(data, dict) else None
        except AttributeError:
            total_eur = None
        row = {
            "nombre_archivo": item.get("original_filename"),
            "archivo_hash": item.get("hash"),
            "proveedor_nombre": ((data.get("proveedor") or {}).get("nombre")) if isinstance(data, dict) else None,
            "proveedor_cif": ((data.get("proveedor") or {}).get("cif_nif")) if isinstance(data, dict) else None,
            "albaran_numero": ((data.get("albaran") or {}).get("numero")) if isinstance(data, dict) else None,
            "albaran_fecha": ((data.get("albaran") or {}).get("fecha")) if isinstance(data, dict) else None,
            "total_eur": total_eur,
            "confianza": ((data.get("confianza") or {}).get("global")) if isinstance(data, dict) else None,
            "puntuacion": ((data.get("confianza") or {}).get("puntuacion_0_100")) if isinstance(data, dict) else None,
            "requirio_revision": 1 if item.get("pila") == "revisar" else 0,
            "input_tokens": meta.get("input_tokens"),
            "output_tokens": meta.get("output_tokens"),
            "coste_eur": coste,
            "json_original": json.dumps(data, ensure_ascii=False),
            "json_corregido": None,
            "enviado_erp": 0,
        }
        item["db_id"] = await db.insert(row)

    session["coste_eur"] = round(total_coste, 6)
    return {"session_id": session_id, "items": session["items"], "coste_eur": session["coste_eur"]}


async def _procesar_item(claude: ClaudeService, item: dict) -> None:
    try:
        data = await claude.analizar_albaran_async(item["stored_path"])
    except Exception as e:  # noqa: BLE001
        logger.exception("Fallo procesando %s", item.get("original_filename"))
        item["data"] = {"pagina_ilegible": True, "motivo": f"error_api: {e}"}
        item["pila"] = "problemas"
        item["status"] = "error"
        return
    # PDF previews (only once, for display during revision)
    if item.get("ext") == ".pdf" and not item.get("preview_urls"):
        try:
            item["preview_urls"] = file_service.pdf_to_png(item["stored_path"])
        except Exception:  # noqa: BLE001
            logger.exception("No se pudo renderizar PDF %s", item.get("original_filename"))
            item["preview_urls"] = []
    item["data"] = data
    item["pila"] = clasificar_pila(data)
    item["status"] = "done"


async def _has_body(request: Request) -> bool:
    try:
        raw = await request.body()
        return bool(raw)
    except Exception:
        return False


@app.post("/api/confirmar/{session_id}/{item_id}")
async def confirmar(session_id: str, item_id: str, payload: dict):
    session = _get_session(session_id)
    item = next((i for i in session["items"] if i["id"] == item_id), None)
    if item is None:
        raise HTTPException(404, "Item no encontrado")
    # Validate basic shape
    try:
        AlbaranExtraido.model_validate(payload)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(422, f"JSON inválido: {e}") from e
    item["data_corregido"] = payload
    item["pila"] = "listos"
    item["confirmado"] = True
    if item.get("db_id"):
        await db.update_corregido(item["db_id"], payload)
    # Find next revision item
    pendientes = [i for i in session["items"] if i["pila"] == "revisar" and not i.get("descartado")]
    next_id = pendientes[0]["id"] if pendientes else None
    return {"ok": True, "next_id": next_id}


@app.post("/api/descartar/{session_id}/{item_id}")
async def descartar(session_id: str, item_id: str):
    session = _get_session(session_id)
    item = next((i for i in session["items"] if i["id"] == item_id), None)
    if item is None:
        raise HTTPException(404, "Item no encontrado")
    item["descartado"] = True
    item["pila"] = "problemas"
    pendientes = [i for i in session["items"] if i["pila"] == "revisar" and not i.get("descartado")]
    next_id = pendientes[0]["id"] if pendientes else None
    return {"ok": True, "next_id": next_id}


def _build_export_payload(session: dict[str, Any]) -> dict[str, Any]:
    albaranes_out: list[dict] = []
    auto = 0
    manual = 0
    for item in session["items"]:
        if item.get("descartado"):
            continue
        data = item.get("data_corregido") or item.get("data")
        if not isinstance(data, dict) or data.get("pagina_ilegible"):
            continue
        # Strip internal metadata from export
        clean = {k: v for k, v in data.items() if k != "_meta"}
        clean["_archivo_origen"] = item.get("original_filename")
        albaranes_out.append(clean)
        if item.get("confirmado"):
            manual += 1
        else:
            auto += 1
    payload = {
        "metadata": {
            "fecha_procesamiento": dt.datetime.utcnow().isoformat(timespec="seconds"),
            "total_albaranes": len(albaranes_out),
            "procesados_automaticamente": auto,
            "corregidos_manualmente": manual,
            "coste_api_eur": round(session.get("coste_eur", 0.0), 4),
        },
        "albaranes": albaranes_out,
    }
    return payload


@app.get("/api/export/{session_id}")
async def export_json(session_id: str):
    session = _get_session(session_id)
    payload = _build_export_payload(session)
    stamp = dt.datetime.utcnow().strftime("%Y-%m-%d_%H%M%S")
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="albaranes_{stamp}.json"'},
    )


@app.post("/api/enviar-erp/{session_id}")
async def enviar_erp(session_id: str):
    session = _get_session(session_id)
    if not erp_service.configured:
        raise HTTPException(400, "ERP_WEBHOOK_URL no configurado. Usa /api/export para descarga local.")
    payload = _build_export_payload(session)
    try:
        res = await erp_service.send(payload)
    except Exception as e:  # noqa: BLE001
        logger.exception("Fallo enviando a ERP")
        raise HTTPException(502, f"Error enviando a ERP: {e}") from e
    ids = [i["db_id"] for i in session["items"] if i.get("db_id")]
    await db.mark_enviado(ids)
    return {"ok": True, "erp_response": res}


@app.get("/api/item/{session_id}/{item_id}")
async def get_item(session_id: str, item_id: str):
    session = _get_session(session_id)
    item = next((i for i in session["items"] if i["id"] == item_id), None)
    if item is None:
        raise HTTPException(404, "Item no encontrado")
    return item


@app.get("/api/stats")
async def api_stats():
    return await db.stats()


@app.get("/healthz")
async def healthz():
    return JSONResponse({"ok": True, "claude": claude_service is not None})
