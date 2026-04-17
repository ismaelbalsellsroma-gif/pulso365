from __future__ import annotations

import hashlib
import logging
import shutil
import uuid
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)

ALLOWED_EXT = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


class FileService:
    """Stores uploads under a stable UUID, computes hashes, renders PDF previews."""

    def __init__(self, uploads_dir: str, static_dir: str):
        self.uploads_dir = Path(uploads_dir)
        self.static_dir = Path(static_dir)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        (self.static_dir / "uploads").mkdir(parents=True, exist_ok=True)

    @staticmethod
    def sha256(path: str | Path) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()

    def validate(self, filename: str, content_type: str | None, size: int) -> str:
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXT:
            raise ValueError(f"Extensión no permitida: {ext}")
        if content_type and content_type not in ALLOWED_MIME:
            raise ValueError(f"MIME no permitido: {content_type}")
        if size > MAX_BYTES:
            raise ValueError("Archivo supera 10 MB")
        return ext

    def save_upload(self, data: bytes, original_filename: str) -> dict:
        ext = Path(original_filename).suffix.lower()
        file_id = uuid.uuid4().hex
        stored_name = f"{file_id}{ext}"
        dest_upload = self.uploads_dir / stored_name
        with open(dest_upload, "wb") as f:
            f.write(data)
        # Copy to static so the browser can show the preview
        dest_static = self.static_dir / "uploads" / stored_name
        shutil.copy2(dest_upload, dest_static)
        hash_ = self.sha256(dest_upload)
        return {
            "id": file_id,
            "original_filename": original_filename,
            "stored_name": stored_name,
            "path": str(dest_upload),
            "static_url": f"/static/uploads/{stored_name}",
            "ext": ext,
            "hash": hash_,
            "size": len(data),
        }

    def pdf_to_png(self, pdf_path: str | Path, max_pages: int = 10) -> list[str]:
        """Render PDF pages to PNG in static/uploads. Returns list of URLs."""
        try:
            import pypdfium2 as pdfium  # type: ignore
        except ImportError:
            logger.warning("pypdfium2 not available — skipping PDF preview")
            return []
        pdf_path = Path(pdf_path)
        base = pdf_path.stem
        urls: list[str] = []
        pdf = pdfium.PdfDocument(str(pdf_path))
        for i, page in enumerate(pdf):
            if i >= max_pages:
                break
            bitmap = page.render(scale=2.0)
            pil_image = bitmap.to_pil()
            out = self.static_dir / "uploads" / f"{base}_p{i + 1}.png"
            pil_image.save(out, "PNG")
            urls.append(f"/static/uploads/{out.name}")
        return urls

    def cleanup_old(self, keep: Iterable[str]) -> None:
        keep_set = set(keep)
        for p in self.static_dir.glob("uploads/*"):
            if p.name not in keep_set and p.name != ".gitkeep":
                try:
                    p.unlink()
                except OSError:
                    pass
