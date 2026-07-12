from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import settings
from app.core import security
from app.models.models import User, AuditLog
from app.schemas.schemas import UserCreate, UserLogin, Token, UserResponse, UserBase

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system."
        )
    hashed_password = security.get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Audit log
    log = AuditLog(
        user_id=user.id,
        action="Register",
        details=f"User registered with email {user.email}"
    )
    db.add(log)
    db.commit()
    
    return user

@router.post("/login", response_model=Token)
def login(
    user_in: UserLogin, db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    
    # Audit log
    log = AuditLog(
        user_id=user.id,
        action="Login",
        details="User logged in successfully"
    )
    db.add(log)
    db.commit()
    
    user_data = UserBase(email=user.email, full_name=user.full_name)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@router.post("/login/swagger", response_model=Token, include_in_schema=False)
def login_swagger(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    Standard OAuth2 password flow for Swagger UI /docs
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    user_data = UserBase(email=user.email, full_name=user.full_name)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@router.get("/google-login-url")
def get_google_login_url():
    """
    Returns the Google OAuth login link.
    """
    # For production, construct proper OAuth 2.0 URL
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    client_id = settings.GOOGLE_CLIENT_ID or "mock-client-id"
    scope = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
    
    google_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}"
    )
    return {"url": google_url}

@router.get("/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    """
    Mock Google OAuth callback. Exchanges auth code for user details and tokens.
    """
    # In production, we make a POST to Google Token API and then fetch user profile.
    # Here we mock/simulate Google returning a user email based on code.
    mock_email = f"google_user_{code[:6]}@gmail.com"
    mock_name = f"Google User {code[:6].capitalize()}"
    
    user = db.query(User).filter(User.email == mock_email).first()
    if not user:
        # Create a new user with google details and empty password since it is OAuth
        hashed_password = security.get_password_hash(f"google_oauth_rand_pw_{code}")
        user = User(
            email=mock_email,
            hashed_password=hashed_password,
            full_name=mock_name,
            encrypted_oauth_token=security.encrypt_data(f"mock-google-token-{code}")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Log
        log = AuditLog(
            user_id=user.id,
            action="Register (Google OAuth)",
            details=f"User registered via Google OAuth: {user.email}"
        )
        db.add(log)
        db.commit()
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "full_name": user.full_name
        }
    }
