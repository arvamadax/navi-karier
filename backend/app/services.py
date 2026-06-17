import os
import logging
import PyPDF2
from typing import Dict, Any

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_stream) -> str:
    reader = PyPDF2.PdfReader(file_stream)
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text


ROLE_SKILL_MAP = {
    "Data Analyst": {
        "JUNIOR": [
            ("SQL", 70), ("Excel", 60), ("Python", 50), ("Statistics", 55),
            ("Data Visualization", 60), ("Communication", 50),
        ],
        "MID": [
            ("SQL", 85), ("Python", 75), ("Tableau/Power BI", 70), ("Statistics", 75),
            ("Machine Learning Basics", 60), ("Data Storytelling", 70),
        ],
        "SENIOR": [
            ("SQL", 95), ("Python", 90), ("Machine Learning", 85), ("Statistics", 90),
            ("Data Engineering", 75), ("Leadership", 70), ("A/B Testing", 80),
        ],
    },
    "Software Engineer": {
        "JUNIOR": [
            ("Programming Fundamentals", 70), ("Git", 60), ("HTML/CSS", 55),
            ("JavaScript", 60), ("Problem Solving", 65), ("API Basics", 50),
        ],
        "MID": [
            ("System Design", 70), ("JavaScript/TypeScript", 80), ("React/Vue", 75),
            ("Node.js/Python", 75), ("Docker", 65), ("SQL", 70), ("Testing", 70),
        ],
        "SENIOR": [
            ("System Design", 90), ("Architecture Patterns", 85), ("Cloud (AWS/GCP)", 80),
            ("Kubernetes", 75), ("CI/CD", 80), ("Leadership", 70), ("Security", 75),
        ],
    },
    "Product Manager": {
        "JUNIOR": [
            ("Market Research", 60), ("User Stories", 55), ("Data Analysis", 50),
            ("Communication", 65), ("Agile/Scrum", 55), ("Wireframing", 50),
        ],
        "MID": [
            ("Product Strategy", 75), ("Stakeholder Management", 70), ("Data-Driven Decisions", 75),
            ("Roadmap Planning", 70), ("A/B Testing", 65), ("Technical Understanding", 65),
        ],
        "SENIOR": [
            ("Vision & Strategy", 90), ("Cross-functional Leadership", 85), ("P&L Management", 75),
            ("Market Analysis", 80), ("Executive Communication", 85), ("Innovation", 80),
        ],
    },
}

COURSE_MAP = {
    "SQL": ["SQL for Data Science — Coursera", "Advanced SQL — DataCamp"],
    "Python": ["Python for Everybody — Coursera", "Automate the Boring Stuff"],
    "Excel": ["Excel Skills for Business — Coursera"],
    "Statistics": ["Statistics with R — edX", "Khan Academy Statistics"],
    "Data Visualization": ["Data Visualization with Tableau — Coursera"],
    "Machine Learning": ["Machine Learning — Andrew Ng (Coursera)", "Fast.ai Practical ML"],
    "Machine Learning Basics": ["Intro to Machine Learning — Kaggle"],
    "Docker": ["Docker Mastery — Udemy", "Docker Getting Started — docs.docker.com"],
    "Kubernetes": ["Kubernetes for Beginners — KodeKloud"],
    "System Design": ["System Design Primer — GitHub", "Grokking System Design"],
    "JavaScript": ["JavaScript.info", "freeCodeCamp JavaScript"],
    "JavaScript/TypeScript": ["TypeScript Handbook", "Total TypeScript — Matt Pocock"],
    "React/Vue": ["React Official Tutorial", "Vue Mastery"],
    "Git": ["Git & GitHub — freeCodeCamp"],
    "Cloud (AWS/GCP)": ["AWS Cloud Practitioner — AWS Training"],
    "CI/CD": ["GitHub Actions Documentation"],
    "Product Strategy": ["Product School — Free Resources"],
    "Stakeholder Management": ["Stakeholder Management — LinkedIn Learning"],
    "Leadership": ["Leadership Foundations — LinkedIn Learning"],
    "Communication": ["Business Communication — Coursera"],
    "A/B Testing": ["A/B Testing by Google — Udacity"],
    "Tableau/Power BI": ["Google Data Analytics Certificate — Coursera"],
    "Data Storytelling": ["Storytelling with Data — Cole Nussbaumer"],
    "Agile/Scrum": ["Agile with Atlassian Jira — Coursera"],
}


def _simulate_cv_scores(cv_text: str, skills: list) -> list:
    import hashlib

    text_lower = cv_text.lower() if cv_text else ""
    results = []
    for skill_name, required in skills:
        keyword = skill_name.lower().split("/")[0].split("(")[0].strip()
        base = 20
        if keyword in text_lower:
            base = 55
        seed = int(hashlib.md5(f"{skill_name}{len(cv_text or '')}".encode()).hexdigest()[:8], 16)
        jitter = (seed % 25)
        current = min(base + jitter, 95)
        gap = max(0, required - current)
        priority = "HIGH" if gap >= 30 else "MEDIUM" if gap >= 15 else "LOW"
        results.append({
            "skill": skill_name,
            "current": current,
            "required": required,
            "gap": gap,
            "priority": priority,
        })
    return results


def _analyze_gap_hardcoded(cv_text: str, target_role: str, level: str = "MID") -> Dict[str, Any]:
    role_skills = ROLE_SKILL_MAP.get(target_role, ROLE_SKILL_MAP.get("Software Engineer"))
    level_upper = level.upper()
    skills_required = role_skills.get(level_upper, role_skills.get("MID"))

    skill_results = _simulate_cv_scores(cv_text, skills_required)

    total_required = sum(s["required"] for s in skill_results)
    total_current = sum(min(s["current"], s["required"]) for s in skill_results)
    match_score = round((total_current / total_required) * 100, 1) if total_required > 0 else 0

    missing = [s["skill"] for s in skill_results if s["gap"] >= 20]

    courses = []
    for skill_name in missing:
        courses.extend(COURSE_MAP.get(skill_name, [f"Search '{skill_name} course' on Coursera"]))

    return {
        "match_score": match_score,
        "skills": skill_results,
        "missing_skills": missing,
        "recommended_courses": courses[:8],
    }


def analyze_gap_with_llm(cv_text: str, target_role: str, level: str = "MID") -> Dict[str, Any]:
    if os.getenv("ANTHROPIC_API_KEY"):
        try:
            from .ai_service import analyze_cv_with_claude
            return analyze_cv_with_claude(cv_text, target_role, level)
        except Exception as e:
            logger.warning("AI analysis failed, falling back to hardcoded: %s", e)

    return _analyze_gap_hardcoded(cv_text, target_role, level)
