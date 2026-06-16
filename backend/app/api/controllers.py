import json
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from .. import services, models
from ..auth import hash_password, verify_password, create_access_token
from ..schemas import UserRegister, UserLogin


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
