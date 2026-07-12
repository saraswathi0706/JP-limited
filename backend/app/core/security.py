import base64
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
import bcrypt
from cryptography.fernet import Fernet
from app.core.config import settings

# Fernet encryption key validation & fallback
def get_fernet_key() -> bytes:
    try:
        # Check if settings key is a valid Fernet key
        key_bytes = settings.ENCRYPTION_KEY.encode()
        # Verify if it can initialize a Fernet instance
        Fernet(key_bytes)
        return key_bytes
    except Exception:
        # Fallback key generated securely or padded to 32 bytes
        # Let's derive a 32-byte base64 key from the setting
        key_raw = settings.SECRET_KEY[:32].ljust(32, "x")
        return base64.urlsafe_b64encode(key_raw.encode())

def encrypt_data(data: str) -> str:
    if not data:
        return ""
    key = get_fernet_key()
    fernet = Fernet(key)
    return fernet.encrypt(data.encode()).decode()

def decrypt_data(token: str) -> str:
    if not token:
        return ""
    key = get_fernet_key()
    fernet = Fernet(key)
    try:
        return fernet.decrypt(token.encode()).decode()
    except Exception:
        return ""

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
