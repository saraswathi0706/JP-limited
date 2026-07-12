from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Resume, Job, AuditLog
from app.schemas.schemas import CoverLetterRequest, CoverLetterResponse
from app.services import ai_service

router = APIRouter()

@router.post("/", response_model=CoverLetterResponse)
def generate_job_cover_letter(
    request: CoverLetterRequest,
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
        
    # 2. Fetch job details
    job = db.query(Job).filter(Job.id == request.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
        
    # 3. Generate cover letter
    cover_letter_text = ai_service.generate_cover_letter(
        latest_resume.parsed_json,
        job.title,
        job.company,
        job.description,
        tone=request.tone
    )
    
    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        action="Generate Cover Letter",
        details=f"Generated {request.tone} cover letter for '{job.title}' at {job.company}."
    )
    db.add(log)
    db.commit()
    
    return {"cover_letter": cover_letter_text}
