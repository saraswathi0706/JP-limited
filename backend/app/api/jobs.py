from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Job, Portal, Application, Resume, AuditLog, MatchScore
from app.schemas.schemas import JobSearchRequest, JobResponse, ApplicationResponse, ApplicationCreate
from app.connectors.adapters import get_connector, list_available_portals
from app.services import ai_service

router = APIRouter()

@router.post("/search", response_model=List[JobResponse])
def search_jobs(
    search_req: JobSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Gather all active portals
    portals = db.query(Portal).filter(Portal.is_active == True).all()
    if not portals:
        # Auto-seed portals table if empty
        available_names = list_available_portals()
        for idx, name in enumerate(available_names):
            new_p = Portal(id=idx+1, name=name, base_url=f"https://api.{name.lower().replace(' ', '')}.com", is_active=True)
            db.add(new_p)
        db.commit()
        portals = db.query(Portal).filter(Portal.is_active == True).all()

    # Search parameters
    query = {
        "keywords": search_req.keywords or "",
        "location": search_req.location or "",
        "remote": search_req.remote
    }

    found_jobs = []
    
    # 2. Query each portal via its connector
    for portal in portals:
        try:
            connector = get_connector(portal.name)
            portal_jobs = connector.search_jobs(query)
            
            for pj in portal_jobs:
                # Check if job already exists in db by title, company, location, portal
                db_job = db.query(Job).filter(
                    Job.title == pj["title"],
                    Job.company == pj["company"],
                    Job.portal_id == portal.id
                ).first()
                
                if not db_job:
                    db_job = Job(
                        portal_id=portal.id,
                        title=pj["title"],
                        company=pj["company"],
                        location=pj["location"],
                        description=pj["description"],
                        salary=pj.get("salary"),
                        experience_level=pj.get("experience_level"),
                        work_type=pj.get("work_type"),
                        url=f"{portal.base_url}/jobs/view/{random_id()}" if not pj.get("url") else pj["url"]
                    )
                    db.add(db_job)
                    db.commit()
                    db.refresh(db_job)
                
                found_jobs.append(db_job)
        except Exception as e:
            print(f"Error searching jobs on {portal.name}: {e}")
            
    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        action="Search Jobs",
        details=f"Keywords: '{search_req.keywords}', Location: '{search_req.location}'. Found {len(found_jobs)} jobs."
    )
    db.add(log)
    db.commit()
    
    return found_jobs

@router.post("/apply", response_model=ApplicationResponse)
def apply_to_job(
    app_in: ApplicationCreate,
    threshold: float = Query(70.0, description="Minimum match score threshold to allow automation"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch latest resume
    latest_resume = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).first()
    if not latest_resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must upload a resume before applying."
        )
        
    # 2. Fetch Job details
    job = db.query(Job).filter(Job.id == app_in.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found."
        )
        
    # Check if already applied
    existing_app = db.query(Application).filter(
        Application.user_id == current_user.id,
        Application.job_id == job.id
    ).first()
    
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have already applied for this job (Status: {existing_app.status})."
        )

    # 3. Match resume details against job description using AI to get match score
    match_result = ai_service.match_resume_job(latest_resume.parsed_json, job.description)
    score_val = match_result.get("score", 0.0)
    
    # Save Match score
    match_score_record = MatchScore(
        user_id=current_user.id,
        job_id=job.id,
        score=score_val,
        analysis_json=match_result
    )
    db.add(match_score_record)
    
    # Check match threshold
    if score_val < threshold:
        db.commit() # Save match score anyway
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Your profile match score ({score_val}%) is below the required automation threshold ({threshold}%)."
        )
        
    # 4. Generate customized cover letter
    cover_letter = ai_service.generate_cover_letter(
        latest_resume.parsed_json, job.title, job.company, job.description
    )
    
    # 5. Fetch Portal Connector, trigger candidate signup API, and submit application API
    portal = db.query(Portal).filter(Portal.id == job.portal_id).first()
    portal_name = portal.name if portal else "Indeed"
    
    try:
        connector = get_connector(portal_name)
        
        # Step 1: Automatic Candidate Signup API (using User Gmail ID)
        signup_res = connector.sign_up_candidate(current_user.email, latest_resume.parsed_json)
        
        # Step 2: Automatic Job Apply API
        apply_res = connector.apply_job(job.__dict__, latest_resume.parsed_json, cover_letter)
        app_status = apply_res.get("status", "applied")
    except Exception as e:
        print(f"Connector api error: {e}")
        app_status = "pending"
        
    # 6. Create Application record
    new_app = Application(
        user_id=current_user.id,
        job_id=job.id,
        status=app_status,
        match_score=score_val,
        cover_letter=cover_letter
    )
    db.add(new_app)
    
    # Audit Log
    log = AuditLog(
        user_id=current_user.id,
        action="Apply Job",
        details=f"Automated application submitted for '{job.title}' at {job.company} (Portal: {portal_name}). Status: {app_status}."
    )
    db.add(log)
    db.commit()
    db.refresh(new_app)
    
    return new_app

def random_id() -> int:
    import random
    return random.randint(1000000, 9999999)
