from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)

try:
    # If postgres, set a short connection timeout for testing availability
    if "pg8000" in db_url:
        # test connection with short timeout
        engine = create_engine(db_url, connect_args={"timeout": 3})
        with engine.connect() as conn:
            pass
    else:
        engine = create_engine(db_url)
except Exception:
    # Fallback to sqlite if postgres is not running (e.g. running outside Docker)
    import os
    if not os.path.exists("/.dockerenv"):
        print("PostgreSQL connection failed. Falling back to local SQLite for host development.")
        if os.getenv("VERCEL"):
            db_url = "sqlite:////tmp/bridgesmart.db"
        else:
            db_url = "sqlite:///./bridgesmart.db"
        engine = create_engine(db_url)
    else:
        engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
