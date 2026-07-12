#!/bin/sh
# Start Celery worker in the background
celery -A app.tasks.celery_app worker --loglevel=info &

# Start FastAPI backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000
