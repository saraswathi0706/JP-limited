import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "BridgeSmart"
    API_V1_STR: str = "/api/v1"
    
    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeyforbridgesmartjwttokengeneration1234567890!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Credential Encryption (Fernet key)
    # Generate one using: cryptography.fernet.Fernet.generate_key().decode()
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "Ym9va21hcmtfc2VjcmV0X2tleV8xMjM0NTY3ODkwMTI=") 
    
    # Databases & Queues
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/bridgesmart")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    
    # AI Services
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    
    # OAuth Settings (Gmail)
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/callback")

    class Config:
        case_sensitive = True

settings = Settings()
