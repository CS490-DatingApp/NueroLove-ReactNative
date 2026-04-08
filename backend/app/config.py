from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT_DIR / ".env"


class Settings(BaseSettings):
    # Firebase
    firebase_credentials_path: str | None = Field(default=None)
    firebase_project_id: str | None = Field(default=None)
    firebase_credentials_json: str | None = Field(default=None)
    firebase_web_api_key: str | None = Field(default=None)

    # OpenAI
    openai_api_key: str | None = Field(default=None)

    # Qdrant
    qdrant_url: str | None = Field(default=None)
    qdrant_api_key: str | None = Field(default=None)

    model_config = {
        "env_file": str(ENV_FILE) if ENV_FILE.exists() else None,
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
