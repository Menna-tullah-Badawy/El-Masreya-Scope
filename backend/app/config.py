from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    DATABASE_URL: str = "postgresql+psycopg2://scope:scope123@127.0.0.1:5432/scopedb"
    JWT_SECRET: str = "dev-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_CURRENCY: str = "egp"

    COMPANY_NAME_AR: str = "سكوب"
    COMPANY_NAME_EN: str = "SCOPE Egypt"
    COMPANY_PHONE: str = "01113138839"
    COMPANY_WHATSAPP: str = "201113138839"
    COMPANY_EMAIL: str = "info@scope-eg.com"
    COMPANY_ADDRESS_AR: str = "الجيزة، مصر"
    COMPANY_ADDRESS_EN: str = "Giza, Egypt"
    CURRENCY_AR: str = "جنيه"
    CURRENCY_EN: str = "EGP"

    CORS_ORIGINS: str = "*"

    UPLOAD_DIR: Path = BASE_DIR / "uploads"

    @property
    def stripe_enabled(self) -> bool:
        return bool(self.STRIPE_SECRET_KEY.strip())


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
