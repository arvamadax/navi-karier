from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user, require_role
from ..schemas import UserRegister, UserLogin, AnalyzeRequest, ProfileUpdate, PasswordChange, ForgotPasswordRequest, ResetPasswordRequest, ContactRequest
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
    return {
        "id": user.id, "name": user.name, "email": user.email, "role": user.role,
        "phone": user.phone, "bio": user.bio,
        "target_role": user.target_role, "experience_level": user.experience_level,
    }

@router.put("/auth/profile")
def update_profile(
    payload: ProfileUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return controllers.update_profile(payload, user, db)

@router.put("/auth/password")
def change_password(
    payload: PasswordChange,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return controllers.change_password(payload, user, db)

@router.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return controllers.forgot_password(payload, db)

@router.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    return controllers.reset_password(payload, db)

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

# --- Contact ---
@router.post("/contact")
def contact(payload: ContactRequest):
    return controllers.handle_contact(payload)

# --- Admin (ADMIN only) ---
@router.get("/admin/overview")
def admin_overview(user: models.User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    return controllers.get_admin_overview(db)

@router.get("/admin/users")
def admin_users(user: models.User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    return controllers.get_admin_users(db)

# --- Company (COMPANY or ADMIN) ---
@router.get("/company/overview")
def company_overview(user: models.User = Depends(require_role("COMPANY", "ADMIN")), db: Session = Depends(get_db)):
    return controllers.get_company_overview(db)

@router.get("/company/talent")
def company_talent(user: models.User = Depends(require_role("COMPANY", "ADMIN")), db: Session = Depends(get_db)):
    return controllers.get_company_talent(db)
