from app.tasks.celery_app import celery_app
from app.database import SessionLocal
from app.models.models import Resume, Skill, Job, Application, Portal, AuditLog
from app.services import ai_service
from app.connectors.adapters import get_connector

@celery_app.task(name="app.tasks.parse_resume_task")
def parse_resume_task(resume_id: int):
    db = SessionLocal()
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume or not resume.raw_text:
            return "Resume not found or raw text empty"
            
        parsed_json = ai_service.parse_resume(resume.raw_text)
        resume.parsed_json = parsed_json
        
        # Sync skills
        extracted_skills = parsed_json.get("skills", [])
        for skill_name in extracted_skills:
            exists = db.query(Skill).filter(
                Skill.user_id == resume.user_id,
                Skill.name.ilike(skill_name)
            ).first()
            if not exists:
                new_skill = Skill(user_id=resume.user_id, name=skill_name, proficiency="Intermediate")
                db.add(new_skill)
                
        # Log
        log = AuditLog(
            user_id=resume.user_id,
            action="Celery Resume Parse",
            details=f"Asynchronously parsed resume ID: {resume.id}"
        )
        db.add(log)
        db.commit()
        return f"Successfully parsed resume ID: {resume_id}"
    except Exception as e:
        db.rollback()
        return f"Error parsing resume: {str(e)}"
    finally:
        db.close()

@celery_app.task(name="app.tasks.apply_job_task")
def apply_job_task(user_id: int, job_id: int, cover_letter: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        resume = db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.created_at.desc()).first()
        portal = db.query(Portal).filter(Portal.id == job.portal_id).first()
        
        if not job or not resume or not portal:
            return "Missing job, resume, or portal references"
            
        # Initialize connector
        connector = get_connector(portal.name)
        apply_res = connector.apply_job(job.__dict__, resume.parsed_json, cover_letter)
        app_status = apply_res.get("status", "applied")
        
        # Save application
        new_app = Application(
            user_id=user_id,
            job_id=job_id,
            status=app_status,
            cover_letter=cover_letter
        )
        db.add(new_app)
        
        # Log
        log = AuditLog(
            user_id=user_id,
            action="Celery Apply Job",
            details=f"Asynchronously applied to job ID: {job_id} on portal: {portal.name}. Status: {app_status}."
        )
        db.add(log)
        db.commit()
        return f"Application submitted successfully with status: {app_status}"
    except Exception as e:
        db.rollback()
        return f"Error executing apply job: {str(e)}"
    finally:
        db.close()
