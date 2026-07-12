import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from app.main import app
from app.api.deps import get_current_user
from app.database import get_db

client = TestClient(app)

# Mock database dependency
@pytest.fixture
def mock_db():
    db = MagicMock()
    return db

# Mock get_current_user dependency
class MockUser:
    id = 1
    email = "testuser@gmail.com"
    full_name = "Test User"

@pytest.fixture
def mock_user():
    return MockUser()

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_auth_register_validation():
    # Test registration fails on invalid email validation
    response = client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "pwd",
        "full_name": "Invalid Email"
    })
    assert response.status_code == 422

def test_auth_login_validation():
    # Test missing email in login payload validation
    response = client.post("/api/v1/auth/login", json={
        "password": "pwd"
    })
    assert response.status_code == 422

@patch("app.services.ai_service.local_fallback_parser")
def test_fallback_resume_parser(mock_fallback):
    mock_fallback.return_value = {
        "name": "Alex Candidate",
        "email": "alex@candidate.com",
        "skills": ["Python", "FastAPI"]
    }
    from app.services.ai_service import parse_resume
    res = parse_resume("Raw resume text containing Alex Candidate, Python and FastAPI")
    assert res["name"] == "Alex Candidate"
    assert "Python" in res["skills"]

def test_local_job_match_algorithm():
    from app.services.ai_service import match_resume_job
    resume = {
        "skills": ["Python", "React", "PostgreSQL"]
    }
    job_desc = "Seeking a developer who knows Python, PostgreSQL and Docker"
    match = match_resume_job(resume, job_desc)
    assert "score" in match
    assert match["score"] > 0
    assert "Docker" in match["gaps"]
