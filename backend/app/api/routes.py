from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user
from ..schemas import UserRegister, UserLogin, AnalyzeRequest
from .. import models
from . import controllers

router = APIRouter()

# --- Auth ---
@router.post("/auth/register")
def register(payload: UserRegister, db: Session = Depends(get_db)):
    return controllers.register_user(payload, db)

@router.post("/auth/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    return controllers.login_user(payload, db)

@router.get("/auth/me")
def me(user: models.User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}

# --- CV Upload ---
@router.post("/upload-cv")
def upload_cv(
    file: UploadFile = File(...),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return controllers.process_cv_upload(file, db, user.id)

# --- Gap Analysis ---
@router.post("/analyze-gap")
def analyze_gap(
    payload: AnalyzeRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return controllers.calculate_gap(payload.cv_id, payload.target_role, payload.level, db, user.id)

@router.get("/recommendations/{analysis_id}")
def get_recommendations(
    analysis_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return controllers.get_analysis(analysis_id, user.id, db)

# --- Dashboard ---
@router.get("/dashboard/overview")
def dashboard_overview(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return controllers.get_dashboard_overview(user.id, db)

@router.get("/dashboard/history")
def analysis_history(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return controllers.get_analysis_history(user.id, db)
