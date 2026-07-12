from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserBase

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ResumeParsed(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []

class ResumeResponse(BaseModel):
    id: int
    user_id: int
    raw_text: Optional[str] = None
    parsed_json: Optional[Dict[str, Any]] = None
    file_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class JobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    salary: Optional[str] = None
    experience_level: Optional[str] = None
    work_type: Optional[str] = None

class JobCreate(JobBase):
    portal_id: Optional[int] = None

class JobResponse(JobBase):
    id: int
    portal_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class JobSearchRequest(BaseModel):
    keywords: Optional[str] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    salary: Optional[str] = None
    remote: Optional[bool] = None

class ApplicationCreate(BaseModel):
    job_id: int

class ApplicationUpdate(BaseModel):
    status: str

class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    status: str
    applied_at: datetime
    match_score: Optional[float] = None
    cover_letter: Optional[str] = None
    job: JobResponse

    class Config:
        from_attributes = True

class CoverLetterRequest(BaseModel):
    job_id: int
    tone: Optional[str] = "professional"  # professional, creative, enthusiastic

class CoverLetterResponse(BaseModel):
    cover_letter: str

class MatchScoreRequest(BaseModel):
    job_id: int

class MatchScoreResponse(BaseModel):
    score: float
    gaps: List[str]
    suggestions: List[str]
    explanation: str

class DashboardResponse(BaseModel):
    total_applied: int
    pending: int
    rejected: int
    interviews: int
    average_match_score: float
    applications: List[ApplicationResponse]

class AuditLogResponse(BaseModel):
    id: int
    action: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
