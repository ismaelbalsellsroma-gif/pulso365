# Procesador de Albaranes

App web local para extraer datos estructurados de albaranes (notas de entrega)
de proveedores españoles del sector hostelería/restauración usando **Claude
Opus 4.7**. Clasifica cada albarán en tres pilas (listos / revisar / ilegibles),
ofrece una pantalla de corrección rápida y exporta un JSON consolidado listo
para enviar a un ERP.

## Requisitos

- Python 3.11+
- Una API key de Anthropic — obtén la tuya en
  https://console.anthropic.com/.

## Instalación

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edita .env y añade tu ANTHROPIC_API_KEY
```

## Arrancar

```bash
uvicorn main:app --reload
```

Abre http://localhost:8000 en el navegador.

## Flujo

1. Arrastra uno o varios PDF/JPG/PNG a la pantalla de inicio.
2. Pulsa **Procesar**. Claude Opus 4.7 extrae los datos de cada albarán.
3. Los resultados se clasifican en tres pilas:
   - ✅ **Listos** — confianza alta, verificaciones OK.
   - ⚠️ **Revisar** — confianza media/baja, campos dudosos resaltados.
   - ❌ **Problemas** — páginas ilegibles, duplicados o errores.
4. Revisa los dudosos en la pantalla de corrección (imagen a la izquierda,
   formulario editable a la derecha, atajos `Ctrl+Enter` y `Ctrl+D`).
5. Exporta un único JSON consolidado o envíalo directamente al ERP.

## Configuración opcional del ERP

Si configuras `ERP_WEBHOOK_URL` (y, opcionalmente, `ERP_API_KEY`) en `.env`,
aparecerá un botón **📤 Enviar al ERP** en el resumen final. El payload se envía
como `POST application/json` con cabecera `X-Api-Key` si la has configurado.

Si la URL es `http://` en vez de `https://` se muestra un warning.

## Duplicados

Antes de enviar un albarán a la API se calcula su hash SHA-256 y se consulta
SQLite. Si coincide con uno anterior, se pregunta si reprocesarlo.

## Estructura

```
albaranes-app/
├── main.py               # FastAPI app
├── prompts/
│   └── prompt_extraccion.txt
├── services/
│   ├── claude_service.py # Llamadas a Anthropic
│   ├── file_service.py   # Uploads + preview PDF
│   └── erp_service.py    # Webhook opcional
├── models/albaran.py     # Pydantic models
├── db/database.py        # SQLite async
├── static/
│   ├── css/app.css
│   └── js/{upload,revision}.js
├── templates/            # Jinja2
└── tests/                # pytest + fixtures
```

## Coste estimado

La configuración por defecto usa `claude-opus-4-7` con `max_tokens=4096` y sin
extended thinking. Un albarán típico de 1 página consume ~2-4k tokens de input
y ~1-2k de output, con un coste aproximado de **0.03-0.08 € por albarán**.
Puedes consultar el coste acumulado en `/historico`.

## Tests

```bash
pytest tests/               # unit tests con fixtures en memoria
python tests/run_manual.py  # prueba real contra Claude con tests/fixtures/
```

## Seguridad

- La API key **nunca** se expone al navegador.
- Archivos guardados bajo UUID aleatorio (no se confía en el nombre original).
- Límite de 10 MB por archivo y 20 archivos por lote.
- Validación de MIME type en el backend.

## Mejoras futuras

Ideas que hoy **no** están implementadas:

- Reconocimiento automático de proveedores recurrentes para pre-rellenar campos.
- Few-shot learning con los 2-3 ejemplos más frecuentes del histórico del usuario.
- Soporte multi-usuario con login.
- Integración directa con Holded, Sage, A3.
- PWA con escaneo desde el móvil.
- Aprendizaje de correcciones para alertar de patrones recurrentes.

## FAQ

**¿Qué pasa si la API devuelve algo que no es JSON?**
Se reintenta una vez pidiendo formato estricto. Si vuelve a fallar se marca el
albarán como `pagina_ilegible` con motivo `json_parse_error`.

**¿Puedo usar otro modelo?**
Sí, cambia `MODEL` en `services/claude_service.py`. El prompt está afinado
para Opus 4.7; con modelos inferiores baja la precisión de las verificaciones
aritméticas.

**¿Dónde se guarda el histórico?**
En SQLite (`db/albaranes.db` por defecto).

**¿Borro los archivos subidos?**
Las copias temporales viven en `static/uploads/` y `uploads/`. En v1 no se
limpian automáticamente; puedes vaciarlos manualmente entre sesiones.
