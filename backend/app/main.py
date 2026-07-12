from fastapi import FastAPI
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import engine, Base, SessionLocal
from app.models.models import Portal
from app.api import auth, resume, jobs, dashboard, cover_letter
from app.connectors.adapters import list_available_portals

# Create DB Tables on Startup
Base.metadata.create_all(bind=engine)

# Seed Portals
db = SessionLocal()
try:
    if db.query(Portal).count() == 0:
        available_names = list_available_portals()
        for idx, name in enumerate(available_names):
            p = Portal(
                id=idx+1,
                name=name,
                base_url=f"https://api.{name.lower().replace(' ', '')}.com",
                is_active=True
            )
            db.add(p)
        db.commit()
finally:
    db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="BridgeSmart Job Application Automation Platform REST API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local dev/testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(resume.router, prefix=f"{settings.API_V1_STR}/resume", tags=["Resume Management"])
app.include_router(jobs.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["Job Operations"])
app.include_router(cover_letter.router, prefix=f"{settings.API_V1_STR}/cover-letter", tags=["Cover Letter Generator"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard & Analytics"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to BridgeSmart REST API!",
        "docs": "/docs",
        "status": "online"
    }
