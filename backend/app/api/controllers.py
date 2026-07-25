import json
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, UploadFile
from jose import JWTError
from jose import jwt as jose_jwt
from sqlalchemy.orm import Session

from .. import models, services
from ..auth import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    hash_password,
    verify_password,
)
from ..email_service import send_invite_email, send_reset_password_email
from ..schemas import (
    ContactRequest,
    ForgotPasswordRequest,
    PasswordChange,
    ProfileUpdate,
    ResetPasswordRequest,
    UserLogin,
    UserRegister,
)
from ..skkni_reference import format_reference_standard


def register_user(payload: UserRegister, db: Session):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


def login_user(payload: UserLogin, db: Session):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email atau password salah")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


def process_cv_upload(file: UploadFile, db: Session, user_id: int):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    extracted_text = services.extract_text_from_pdf(file.file)
    cv_data = models.CVData(extracted_text=extracted_text, user_id=user_id)
    db.add(cv_data)
    db.commit()
    db.refresh(cv_data)
    return {"message": "CV uploaded successfully", "cv_id": cv_data.id}


def calculate_gap(cv_id: int, target_role: str, level: str, db: Session, user_id: int):
    cv_data = (
        db.query(models.CVData)
        .filter(models.CVData.id == cv_id, models.CVData.user_id == user_id)
        .first()
    )
    if not cv_data:
        raise HTTPException(status_code=404, detail="CV not found")

    result = services.analyze_gap_with_llm(cv_data.extracted_text, target_role, level)

    analysis = models.AnalysisResult(
        match_score=result["match_score"],
        target_role=target_role,
        level=level,
        missing_skills=",".join(result["missing_skills"]),
        skill_details=json.dumps(result["skills"]),
        recommended_courses=",".join(result["recommended_courses"]),
        user_id=user_id,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "analysis_id": analysis.id,
        "match_score": analysis.match_score,
        "target_role": target_role,
        "level": level,
        "skills": result["skills"],
        "missing_skills": result["missing_skills"],
        "recommended_courses": result["recommended_courses"],
        "reference_standard": result.get("reference_standard") or format_reference_standard(target_role),
    }


def get_analysis(analysis_id: int, user_id: int, db: Session):
    analysis = (
        db.query(models.AnalysisResult)
        .filter(models.AnalysisResult.id == analysis_id, models.AnalysisResult.user_id == user_id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    skills = json.loads(analysis.skill_details) if analysis.skill_details else []
    return {
        "id": analysis.id,
        "match_score": analysis.match_score,
        "target_role": analysis.target_role,
        "level": analysis.level,
        "skills": skills,
        "missing_skills": analysis.missing_skills.split(",") if analysis.missing_skills else [],
        "recommended_courses": analysis.recommended_courses.split(",") if analysis.recommended_courses else [],
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "reference_standard": format_reference_standard(analysis.target_role),
    }


def get_dashboard_overview(user_id: int, db: Session):
    analyses = (
        db.query(models.AnalysisResult)
        .filter(models.AnalysisResult.user_id == user_id)
        .order_by(models.AnalysisResult.created_at.desc())
        .all()
    )

    if not analyses:
        return {
            "match_score": 0,
            "skills_analyzed": 0,
            "gaps_found": 0,
            "total_analyses": 0,
            "recent_analyses": [],
            "top_gaps": [],
        }

    latest = analyses[0]
    all_skills = []
    for a in analyses:
        if a.skill_details:
            all_skills.extend(json.loads(a.skill_details))

    gaps = [s for s in all_skills if s.get("gap", 0) > 0]
    gaps.sort(key=lambda x: x.get("gap", 0), reverse=True)

    recent = [
        {
            "id": a.id,
            "target_role": a.target_role,
            "match_score": a.match_score,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in analyses[:5]
    ]

    return {
        "match_score": latest.match_score,
        "skills_analyzed": len(all_skills),
        "gaps_found": len(gaps),
        "total_analyses": len(analyses),
        "recent_analyses": recent,
        "top_gaps": gaps[:5],
    }


def get_analysis_history(user_id: int, db: Session):
    analyses = (
        db.query(models.AnalysisResult)
        .filter(models.AnalysisResult.user_id == user_id)
        .order_by(models.AnalysisResult.created_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "target_role": a.target_role,
            "level": a.level,
            "match_score": a.match_score,
            "missing_skills": a.missing_skills.split(",") if a.missing_skills else [],
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in analyses
    ]


def update_profile(payload: ProfileUpdate, user: models.User, db: Session):
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "bio": user.bio,
        "target_role": user.target_role,
        "experience_level": user.experience_level,
    }


def change_password(payload: PasswordChange, user: models.User, db: Session):
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Password lama salah")

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"message": "Password berhasil diubah"}


def forgot_password(payload: ForgotPasswordRequest, db: Session):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        return {"message": "Jika email terdaftar, link reset password akan dikirim"}

    reset_token = jose_jwt.encode(
        {
            "sub": str(user.id),
            "purpose": "reset_password",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    send_reset_password_email(user.email, reset_token, user.name)
    return {"message": "Jika email terdaftar, link reset password akan dikirim"}


def reset_password(payload: ResetPasswordRequest, db: Session):
    try:
        token_data = jose_jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        if token_data.get("purpose") != "reset_password":
            raise HTTPException(status_code=400, detail="Token tidak valid")
        user_id = token_data.get("sub")
    except JWTError:
        raise HTTPException(status_code=400, detail="Token tidak valid atau sudah kedaluwarsa")

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Token tidak valid")

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"message": "Password berhasil direset. Silakan login dengan password baru."}


def handle_contact(payload: ContactRequest):
    import resend as resend_mod
    resend_api_key = os.environ.get("RESEND_API_KEY", "")
    target_email = os.environ.get("CONTACT_EMAIL", "hello@navikarier.id")

    if not resend_api_key:
        print(f"[DEV] Contact form: {payload.name} <{payload.email}> [{payload.type}]: {payload.message}")
        return {"message": "Pesan berhasil dikirim"}

    resend_mod.api_key = resend_api_key
    try:
        resend_mod.Emails.send({
            "from": "NaviKarier Contact <noreply@navikarier.com>",
            "to": [target_email],
            "subject": f"[Contact - {payload.type}] dari {payload.name}",
            "html": f"""
            <p><strong>Dari:</strong> {payload.name} ({payload.email})</p>
            <p><strong>Tipe:</strong> {payload.type}</p>
            <hr>
            <p>{payload.message}</p>
            """,
            "reply_to": payload.email,
        })
    except Exception as e:
        print(f"[EMAIL ERROR] Contact form failed: {e}")

    return {"message": "Pesan berhasil dikirim"}


# ============ Admin (aggregate, read-only over existing tables) ============

def get_admin_overview(db: Session):
    users = db.query(models.User).all()
    analyses = db.query(models.AnalysisResult).all()
    cv_count = db.query(models.CVData).count()

    by_role: dict[str, int] = {}
    for u in users:
        by_role[u.role] = by_role.get(u.role, 0) + 1

    scores = [a.match_score for a in analyses if a.match_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    role_demand: dict[str, int] = {}
    for a in analyses:
        role_demand[a.target_role] = role_demand.get(a.target_role, 0) + 1
    top_roles = sorted(role_demand.items(), key=lambda x: x[1], reverse=True)[:5]

    recent = db.query(models.User).order_by(models.User.created_at.desc()).limit(8).all()

    return {
        "total_users": len(users),
        "total_jobseekers": by_role.get("JOBSEEKER", 0),
        "total_companies": by_role.get("COMPANY", 0),
        "total_admins": by_role.get("ADMIN", 0),
        "total_analyses": len(analyses),
        "total_cvs": cv_count,
        "avg_match_score": avg_score,
        "users_by_role": by_role,
        "top_roles": [{"role": r, "count": c} for r, c in top_roles],
        "recent_users": [
            {
                "id": u.id, "name": u.name, "email": u.email, "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in recent
        ],
    }


def get_admin_users(db: Session):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    counts: dict[int, int] = {}
    for (uid,) in db.query(models.AnalysisResult.user_id).all():
        counts[uid] = counts.get(uid, 0) + 1
    return [
        {
            "id": u.id, "name": u.name, "email": u.email, "role": u.role,
            "phone": u.phone, "target_role": u.target_role,
            "analyses_count": counts.get(u.id, 0),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


# ============ Company (talent pool = platform-wide analyses) ============
# Talent pool is platform-wide: the schema has no company-candidate link yet.
# Add an invite/link table when companies need private, per-company pools.

def _aggregate_top_gaps(analyses, limit: int = 8):
    agg: dict[str, list[int]] = {}  # skill -> [sum_gap, count]
    for a in analyses:
        if not a.skill_details:
            continue
        try:
            skills = json.loads(a.skill_details)
        except (json.JSONDecodeError, TypeError):
            continue
        for s in skills:
            gap = s.get("gap", 0)
            if gap <= 0:
                continue
            entry = agg.setdefault(s.get("skill", "?"), [0, 0])
            entry[0] += gap
            entry[1] += 1
    rows = [
        {"skill": k, "avg_gap": round(v[0] / v[1], 1), "count": v[1]}
        for k, v in agg.items()
    ]
    rows.sort(key=lambda x: (x["avg_gap"], x["count"]), reverse=True)
    return rows[:limit]


def get_company_overview(db: Session):
    analyses = db.query(models.AnalysisResult).all()
    candidate_ids = {a.user_id for a in analyses}
    scores = [a.match_score for a in analyses if a.match_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    role_demand: dict[str, int] = {}
    for a in analyses:
        role_demand[a.target_role] = role_demand.get(a.target_role, 0) + 1
    top_roles = sorted(role_demand.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "total_candidates": len(candidate_ids),
        "total_analyses": len(analyses),
        "avg_match_score": avg_score,
        "job_ready": sum(1 for s in scores if s >= 75),
        "top_roles": [{"role": r, "count": c} for r, c in top_roles],
        "top_gaps": _aggregate_top_gaps(analyses),
    }


def get_company_talent(db: Session):
    rows = (
        db.query(models.AnalysisResult, models.User)
        .join(models.User, models.AnalysisResult.user_id == models.User.id)
        .order_by(models.AnalysisResult.match_score.desc())
        .all()
    )
    return [
        {
            "analysis_id": a.id,
            "candidate": u.name,
            "target_role": a.target_role,
            "level": a.level,
            "match_score": a.match_score,
            "missing_count": len(a.missing_skills.split(",")) if a.missing_skills else 0,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a, u in rows
    ]


# ============ Job Roles (company defines competency requirements) ============

def _job_role_dict(role: models.JobRole, db: Session):
    # Match = candidates whose target_role string equals this title.
    # Swap for skill-overlap scoring when a stricter match is needed.
    match_count = (
        db.query(models.AnalysisResult)
        .filter(models.AnalysisResult.target_role == role.title)
        .count()
    )
    skills = [s.strip() for s in (role.required_skills or "").split(",") if s.strip()]
    return {
        "id": role.id, "title": role.title, "level": role.level,
        "required_skills": skills, "match_count": match_count,
        "created_at": role.created_at.isoformat() if role.created_at else None,
    }


def create_job_role(payload, user: models.User, db: Session):
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Judul posisi wajib diisi")
    role = models.JobRole(
        user_id=user.id, title=payload.title.strip(),
        level=payload.level, required_skills=payload.required_skills.strip(),
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return _job_role_dict(role, db)


def list_job_roles(user: models.User, db: Session):
    roles = (
        db.query(models.JobRole)
        .filter(models.JobRole.user_id == user.id)
        .order_by(models.JobRole.created_at.desc())
        .all()
    )
    return [_job_role_dict(r, db) for r in roles]


def delete_job_role(role_id: int, user: models.User, db: Session):
    role = (
        db.query(models.JobRole)
        .filter(models.JobRole.id == role_id, models.JobRole.user_id == user.id)
        .first()
    )
    if not role:
        raise HTTPException(status_code=404, detail="Job role tidak ditemukan")
    db.delete(role)
    db.commit()
    return {"message": "Job role dihapus"}


# ============ Invite & Assess ============

def _invite_dict(inv: models.Invite):
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    return {
        "id": inv.id, "token": inv.token, "target_role": inv.target_role,
        "level": inv.level, "candidate_email": inv.candidate_email,
        "candidate_name": inv.candidate_name, "status": inv.status,
        "link": f"{frontend_url}/invite/{inv.token}",
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


def create_invite(payload, user: models.User, db: Session):
    inv = models.Invite(
        user_id=user.id, token=secrets.token_urlsafe(16),
        target_role=payload.target_role, level=payload.level,
        candidate_email=payload.candidate_email,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    result = _invite_dict(inv)
    if payload.candidate_email:
        send_invite_email(payload.candidate_email, result["link"], user.name, payload.target_role)
    return result


def list_invites(user: models.User, db: Session):
    invs = (
        db.query(models.Invite)
        .filter(models.Invite.user_id == user.id)
        .order_by(models.Invite.created_at.desc())
        .all()
    )
    return [_invite_dict(i) for i in invs]


def get_invite_public(token: str, db: Session):
    inv = db.query(models.Invite).filter(models.Invite.token == token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Undangan tidak ditemukan atau sudah kedaluwarsa")
    company = db.query(models.User).filter(models.User.id == inv.user_id).first()
    return {
        "target_role": inv.target_role, "level": inv.level,
        "company_name": company.name if company else "Perusahaan",
        "status": inv.status,
    }


def submit_invite_assessment(token: str, name: str, file: UploadFile, db: Session):
    inv = db.query(models.Invite).filter(models.Invite.token == token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Undangan tidak ditemukan")
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Hanya file PDF yang didukung")

    # Guest user per invite so the analysis surfaces in the talent pool.
    email = inv.candidate_email or f"guest+{token}@invite.navikarier.local"
    guest = db.query(models.User).filter(models.User.email == email).first()
    if not guest:
        guest = models.User(
            name=name.strip() or "Kandidat", email=email,
            password_hash=hash_password(secrets.token_urlsafe(12)),
            role="JOBSEEKER", target_role=inv.target_role, experience_level=inv.level,
        )
        db.add(guest)
        db.commit()
        db.refresh(guest)

    extracted = services.extract_text_from_pdf(file.file)
    db.add(models.CVData(extracted_text=extracted, user_id=guest.id))
    db.commit()

    result = services.analyze_gap_with_llm(extracted, inv.target_role, inv.level)
    db.add(models.AnalysisResult(
        match_score=result["match_score"], target_role=inv.target_role, level=inv.level,
        missing_skills=",".join(result["missing_skills"]),
        skill_details=json.dumps(result["skills"]),
        recommended_courses=",".join(result["recommended_courses"]),
        user_id=guest.id,
    ))
    inv.status = "COMPLETED"
    inv.candidate_name = name.strip() or inv.candidate_name
    db.commit()

    return {
        "match_score": result["match_score"],
        "target_role": inv.target_role,
        "missing_count": len(result["missing_skills"]),
    }


# ============ OAuth bridge (Google sign-in -> backend user + JWT) ============

def oauth_login(email: str, name: str, db: Session):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            name=name or email.split("@")[0], email=email,
            password_hash=hash_password(secrets.token_urlsafe(16)),
            role="JOBSEEKER",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token, "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }
