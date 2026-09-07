"""
SCOPE Egypt — منصة تأجير وبيع المناظير والأجهزة الطبية
FastAPI backend entrypoint.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from . import models  # noqa: F401  (تسجيل الجداول)
from .routers import auth, catalog, content, documents, maintenance, orders, payments, reports, uploads

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="SCOPE Egypt API",
    description="منصة تأجير وبيع المناظير والأجهزة الطبية — Medical endoscopes & equipment rental/sales platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = ["*"] if settings.CORS_ORIGINS.strip() == "*" else [
    o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.(e2b\.app|app\.github\.dev|githubpreview\.dev|gitpod\.io|onrender\.com|github\.io|vercel\.app|netlify\.app)",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

for r in (auth.router, catalog.router, orders.router, maintenance.router,
          content.router, reports.router, payments.router, documents.router,
          uploads.router):
    app.include_router(r)


@app.get("/", tags=["meta"])
def root():
    return {
        "name": "SCOPE Egypt API",
        "name_ar": settings.COMPANY_NAME_AR,
        "status": "running",
        "docs": "/docs",
        "stripe_enabled": settings.stripe_enabled,
    }


@app.get("/api/health", tags=["meta"])
def health():
    from sqlalchemy import text
    from .database import SessionLocal
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    finally:
        db.close()
    return {"ok": True, "database": "up" if db_ok else "down"}


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    logging.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500,
                        content={"detail": "خطأ غير متوقع في الخادم / Internal server error"})
