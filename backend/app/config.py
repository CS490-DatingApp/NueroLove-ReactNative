from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    jwt_secret: str = "dev-secret-change-in-production"
    database_url: str = "sqlite+aiosqlite:///./neuro.db"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 30

    class Config:
        env_file = ".env"


settings = Settings()
