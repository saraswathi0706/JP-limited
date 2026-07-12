from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session
import os
from typing import Dict, Any
from app.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Resume, Skill, AuditLog, Job, MatchScore
from app.schemas.schemas import ResumeResponse, MatchScoreResponse, MatchScoreRequest
from app.services import ai_service

router = APIRouter()

@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX file types are supported."
        )
        
    file_bytes = await file.read()
    
    # 1. Extract text
    if ext == ".pdf":
        raw_text = ai_service.extract_text_from_pdf(file_bytes)
    else:
        raw_text = ai_service.extract_text_from_docx(file_bytes)
        
    if not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to extract readable text from the uploaded document."
        )
        
    # 2. Parse using AI (OpenAI or Local fallbacks)
    parsed_json = ai_service.parse_resume(raw_text)
    
    # 3. Store resume file information locally
    # We can save files in a local directory if desired.
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"user_{current_user.id}_{filename}")
    with open(file_path, "wb") as f:
        f.write(file_bytes)
        
    # Remove older resumes if desired, or keep track.
    # For now, let's create a new record.
    db_resume = Resume(
        user_id=current_user.id,
        raw_text=raw_text,
        parsed_json=parsed_json,
        file_path=file_path
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    
    # 4. Sync extracted skills to Skill table
    extracted_skills = parsed_json.get("skills", [])
    for skill_name in extracted_skills:
        # Check if already in skills table
        exists = db.query(Skill).filter(
            Skill.user_id == current_user.id,
            Skill.name.ilike(skill_name)
        ).first()
        if not exists:
            new_skill = Skill(user_id=current_user.id, name=skill_name, proficiency="Intermediate")
            db.add(new_skill)
            
    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        action="Upload Resume",
        details=f"Uploaded and parsed resume: {filename}. Extracted {len(extracted_skills)} skills."
    )
    db.add(log)
    db.commit()
    
    return db_resume

@router.post("/match", response_model=MatchScoreResponse)
def match_resume_to_job(
    request: MatchScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch latest resume
    latest_resume = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).first()
    if not latest_resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found. Please upload a resume first."
        )
        
    # 2. Fetch Job Details
    job = db.query(Job).filter(Job.id == request.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
        
    # 3. Match resume details against job description using AI
    match_result = ai_service.match_resume_job(latest_resume.parsed_json, job.description)
    
    # 4. Save/update match score record
    score_val = match_result.get("score", 0.0)
    db_score = db.query(MatchScore).filter(
        MatchScore.user_id == current_user.id,
        MatchScore.job_id == job.id
    ).first()
    
    if db_score:
        db_score.score = score_val
        db_score.analysis_json = match_result
    else:
        db_score = MatchScore(
            user_id=current_user.id,
            job_id=job.id,
            score=score_val,
            analysis_json=match_result
        )
        db.add(db_score)
        
    # Log
    log = AuditLog(
        user_id=current_user.id,
        action="Match Job",
        details=f"Matched resume against job '{job.title}' at {job.company}. Score: {score_val}%."
    )
    db.add(log)
    db.commit()
    
    return {
        "score": score_val,
        "gaps": match_result.get("gaps", []),
        "suggestions": match_result.get("suggestions", []),
        "explanation": match_result.get("explanation", "")
    }

@router.get("/parsed", response_model=Dict[str, Any])
def get_parsed_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve the latest parsed resume details for dashboard display."""
    latest = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).first()
    if not latest:
        return {"parsed": False, "profile": None}
    return {"parsed": True, "profile": latest.parsed_json}
