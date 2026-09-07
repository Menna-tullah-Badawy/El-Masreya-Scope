"""رفع الصور"""
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..config import settings
from ..models import User
from ..security import require_admin

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
MAX_BYTES = 6 * 1024 * 1024


@router.post("")
async def upload(file: UploadFile = File(...), _: User = Depends(require_admin)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"امتداد غير مسموح. المسموح: {', '.join(sorted(ALLOWED))}")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "الحجم الأقصى 6 ميجابايت")
    name = f"{secrets.token_hex(10)}{ext}"
    (settings.UPLOAD_DIR / name).write_bytes(data)
    return {"url": f"/uploads/{name}", "filename": name, "size": len(data)}
