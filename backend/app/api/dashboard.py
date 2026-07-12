from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Application, AuditLog
from app.schemas.schemas import DashboardResponse, ApplicationResponse, AuditLogResponse

router = APIRouter()

@router.get("/", response_model=DashboardResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch all applications
    apps = db.query(Application).filter(Application.user_id == current_user.id).all()
    
    total_applied = 0
    pending = 0
    rejected = 0
    interviews = 0
    score_sum = 0.0
    scored_count = 0
    
    for app in apps:
        total_applied += 1
        status = app.status.lower() if app.status else ""
        if status in ["applied", "submitted"]:
            # let's count applied as total and filter pending
            pass
        if "pend" in status:
            pending += 1
        elif "reject" in status:
            rejected += 1
        elif "interview" in status or "schedule" in status:
            interviews += 1
            
        if app.match_score is not None:
            score_sum += app.match_score
            scored_count += 1
            
    avg_score = round(score_sum / scored_count, 1) if scored_count > 0 else 0.0
    
    # Sort applications by applied_at desc
    sorted_apps = sorted(apps, key=lambda x: x.applied_at, reverse=True)
    
    return {
        "total_applied": total_applied,
        "pending": pending,
        "rejected": rejected,
        "interviews": interviews,
        "average_match_score": avg_score,
        "applications": sorted_apps[:10]  # Return last 10 applications
    }

@router.get("/applications", response_model=List[ApplicationResponse])
def get_all_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    apps = db.query(Application).filter(
        Application.user_id == current_user.id
    ).order_by(Application.applied_at.desc()).all()
    return apps

@router.get("/logs", response_model=List[AuditLogResponse])
def get_user_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.timestamp.desc()).limit(50).all()
    return logs
