"""Seed demo data untuk presentasi MVP.

Idempotent: jika akun demo sudah ada, script berhenti. Hapus navikarier.db
untuk seed ulang. Jalankan dari folder backend/:  python seed.py
"""
import json

from app.database import SessionLocal, engine, Base
from app import models, services
from app.auth import hash_password

Base.metadata.create_all(bind=engine)

# (nama, email, role, level, strength) — strength mengatur sebaran match score.
JOBSEEKERS = [
    ("Budi Santoso", "budi@email.com", "Software Engineer", "MID", "strong"),
    ("Siti Rahma", "siti@email.com", "Data Analyst", "JUNIOR", "mid"),
    ("Andi Wijaya", "andi@email.com", "Product Manager", "MID", "weak"),
    ("Dewi Lestari", "dewi@email.com", "UI/UX Designer", "MID", "strong"),
    ("Rizky Pratama", "rizky@email.com", "DevOps Engineer", "SENIOR", "mid"),
    ("Maya Putri", "maya@email.com", "Data Analyst", "MID", "strong"),
    ("Fajar Nugroho", "fajar@email.com", "Software Engineer", "JUNIOR", "weak"),
    ("Nadia Kusuma", "nadia@email.com", "Digital Marketing Specialist", "MID", "mid"),
]


def _cv_text(role: str, level: str, strength: str) -> str:
    role_skills = services.ROLE_SKILL_MAP.get(role, services.ROLE_SKILL_MAP["Software Engineer"])
    names = [s[0] for s in role_skills.get(level, role_skills.get("MID"))]
    if strength == "strong":
        return "Profesional berpengalaman dengan keahlian: " + ", ".join(names) + ". Beberapa project & sertifikasi relevan."
    if strength == "mid":
        return "Familiar dengan " + ", ".join(names[:3]) + ". Sedang mengembangkan skill lainnya."
    return "Fresh graduate yang antusias belajar dan mencari peluang karier pertama."


def _add_analysis(db, user, role, level, strength):
    cv_text = _cv_text(role, level, strength)
    result = services._analyze_gap_hardcoded(cv_text, role, level)
    db.add(models.CVData(extracted_text=cv_text, user_id=user.id))
    db.add(models.AnalysisResult(
        match_score=result["match_score"],
        target_role=role,
        level=level,
        missing_skills=",".join(result["missing_skills"]),
        skill_details=json.dumps(result["skills"]),
        recommended_courses=",".join(result["recommended_courses"]),
        user_id=user.id,
    ))
    db.commit()


def main():
    db = SessionLocal()
    if db.query(models.User).filter(models.User.email == "admin@navikarier.id").first():
        print("Seed sudah ada — lewati. Hapus navikarier.db untuk re-seed.")
        db.close()
        return

    def mk(name, email, role, pw, target=None, level=None):
        u = models.User(
            name=name, email=email, password_hash=hash_password(pw), role=role,
            target_role=target, experience_level=level,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u

    mk("Admin NaviKarier", "admin@navikarier.id", "ADMIN", "admin123")
    mk("TechCorp HR", "hr@techcorp.id", "COMPANY", "company123")

    for name, email, role, level, strength in JOBSEEKERS:
        u = mk(name, email, "JOBSEEKER", "demo123", role, level)
        _add_analysis(db, u, role, level, strength)
        if strength == "strong":
            # analisis kedua → data trend untuk halaman Progress
            _add_analysis(db, u, role, level, "mid")

    db.close()
    print("Seed selesai. Akun demo:")
    print("  ADMIN    : admin@navikarier.id / admin123")
    print("  COMPANY  : hr@techcorp.id      / company123")
    print("  JOBSEEKER: budi@email.com      / demo123  (+7 lainnya)")


if __name__ == "__main__":
    main()
