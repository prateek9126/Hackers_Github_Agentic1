"""
Application configuration using Pydantic Settings.
Reads parameters from environment variables and .env file.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENV: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "SIH26153 Network Attack Forecaster"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # Database Configuration (Defaults to offline SQLite for 100% standalone reliability)
    DB_ENGINE: str = "sqlite"
    USE_POSTGRES: bool = False

    # PostgreSQL Database Credentials (used when USE_POSTGRES=true)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_secure_password"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "sih26153_forecasting"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Directories
    DATA_DIR: str = "./data"
    CONFIG_PATH: str = "./configs/config.yaml"
    ALLOWED_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://sih26153-forecasting-dashboard.onrender.com",
]

settings = Settings()
