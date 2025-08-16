from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    env: str = "local"
    database_url: str

    model_config = SettingsConfigDict(env_file=".env", env_prefix="", case_sensitive=False)
    
    jwt_secret: str = "dev-secret"
    jwt_alg: str = "HS256"
    jwt_expires_hours: int = 8


class Config:
     env_file = ".env"

settings = Settings()

