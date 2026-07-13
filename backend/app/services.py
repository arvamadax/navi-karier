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
    "UI/UX Designer": {
        "JUNIOR": [
            ("Figma", 65), ("Wireframing", 60), ("UI Design Principles", 60),
            ("Typography & Color", 55), ("Prototyping", 55), ("Communication", 50),
        ],
        "MID": [
            ("Figma", 80), ("User Research", 70), ("Interaction Design", 75),
            ("Design Systems", 70), ("Usability Testing", 70), ("Prototyping", 75),
        ],
        "SENIOR": [
            ("Design Systems", 85), ("User Research", 85), ("Design Leadership", 80),
            ("Product Thinking", 80), ("Accessibility", 80), ("Stakeholder Management", 75),
        ],
    },
    "DevOps Engineer": {
        "JUNIOR": [
            ("Linux", 65), ("Git", 60), ("Bash Scripting", 60),
            ("Docker", 55), ("CI/CD", 55), ("Networking Basics", 50),
        ],
        "MID": [
            ("Docker", 80), ("Kubernetes", 70), ("CI/CD", 75),
            ("Terraform", 70), ("Cloud (AWS/GCP)", 75), ("Monitoring & Logging", 70),
        ],
        "SENIOR": [
            ("Kubernetes", 90), ("Infrastructure as Code", 85), ("Cloud Architecture", 85),
            ("Site Reliability Engineering", 80), ("Security & Compliance", 80), ("Leadership", 75),
        ],
    },
    "Business Analyst": {
        "JUNIOR": [
            ("Excel", 65), ("SQL", 55), ("Requirement Gathering", 60),
            ("Documentation", 60), ("Communication", 65), ("Data Analysis", 50),
        ],
        "MID": [
            ("SQL", 75), ("Business Process Modeling", 75), ("Stakeholder Management", 70),
            ("Data Visualization", 70), ("Agile/Scrum", 65), ("Problem Solving", 75),
        ],
        "SENIOR": [
            ("Strategic Analysis", 90), ("Stakeholder Management", 85), ("Data-Driven Decisions", 85),
            ("Process Improvement", 80), ("Executive Communication", 85), ("Leadership", 75),
        ],
    },
    "Digital Marketing Specialist": {
        "JUNIOR": [
            ("Social Media Marketing", 65), ("Content Writing", 60), ("SEO", 55),
            ("Google Analytics", 55), ("Copywriting", 55), ("Communication", 50),
        ],
        "MID": [
            ("SEO", 75), ("SEM/Google Ads", 75), ("Content Strategy", 70),
            ("Email Marketing", 65), ("Marketing Analytics", 75), ("A/B Testing", 65),
        ],
        "SENIOR": [
            ("Marketing Strategy", 90), ("Growth Marketing", 85), ("Marketing Analytics", 85),
            ("Brand Management", 80), ("Budget Management", 75), ("Leadership", 75),
        ],
    },
    "Fullstack Developer": {
        "JUNIOR": [
            ("HTML/CSS", 65), ("JavaScript", 65), ("Git", 60),
            ("API Basics", 55), ("SQL", 55), ("Problem Solving", 60),
        ],
        "MID": [
            ("JavaScript/TypeScript", 80), ("React/Vue", 75), ("Node.js/Python", 75),
            ("SQL", 70), ("REST API Design", 75), ("Testing", 65),
        ],
        "SENIOR": [
            ("System Design", 90), ("Architecture Patterns", 85), ("Cloud (AWS/GCP)", 80),
            ("DevOps Practices", 75), ("Security", 80), ("Leadership", 75),
        ],
    },
    "Data Scientist": {
        "JUNIOR": [
            ("Python", 65), ("Statistics", 65), ("SQL", 60),
            ("Data Visualization", 55), ("Machine Learning Basics", 55), ("Communication", 50),
        ],
        "MID": [
            ("Machine Learning", 80), ("Python", 80), ("Statistics", 75),
            ("Feature Engineering", 70), ("SQL", 70), ("Data Storytelling", 70),
        ],
        "SENIOR": [
            ("Machine Learning", 90), ("Deep Learning", 85), ("MLOps", 80),
            ("Experiment Design", 85), ("Big Data (Spark)", 75), ("Leadership", 75),
        ],
    },
    "Mobile Developer": {
        "JUNIOR": [
            ("Programming Fundamentals", 65), ("Kotlin/Swift", 60), ("Git", 60),
            ("UI Layout", 60), ("API Basics", 55), ("Problem Solving", 60),
        ],
        "MID": [
            ("Kotlin/Swift", 80), ("Flutter/React Native", 70), ("State Management", 75),
            ("REST API Integration", 75), ("Testing", 65), ("App Performance", 70),
        ],
        "SENIOR": [
            ("Mobile Architecture", 90), ("App Performance", 85), ("CI/CD", 80),
            ("Security", 80), ("Cross-platform Strategy", 75), ("Leadership", 75),
        ],
    },
    "Backend Engineer": {
        "JUNIOR": [
            ("Programming Fundamentals", 70), ("SQL", 60), ("API Basics", 60),
            ("Git", 60), ("Data Structures", 60), ("Problem Solving", 65),
        ],
        "MID": [
            ("Node.js/Python", 80), ("Database Design", 75), ("REST API Design", 80),
            ("Caching", 65), ("Docker", 70), ("Testing", 70),
        ],
        "SENIOR": [
            ("System Design", 90), ("Microservices", 85), ("Database Optimization", 85),
            ("Message Queues", 80), ("Security", 80), ("Leadership", 75),
        ],
    },
    "Frontend Developer": {
        "JUNIOR": [
            ("HTML/CSS", 70), ("JavaScript", 65), ("Git", 60),
            ("Responsive Design", 60), ("Browser DevTools", 55), ("Problem Solving", 60),
        ],
        "MID": [
            ("JavaScript/TypeScript", 80), ("React/Vue", 80), ("State Management", 75),
            ("Web Performance", 70), ("Testing", 65), ("CSS Architecture", 70),
        ],
        "SENIOR": [
            ("Frontend Architecture", 90), ("Web Performance", 85), ("JavaScript/TypeScript", 90),
            ("Accessibility", 80), ("Design Systems", 75), ("Leadership", 75),
        ],
    },
    "Quality Assurance Engineer": {
        "JUNIOR": [
            ("Manual Testing", 65), ("Test Case Design", 65), ("Bug Reporting", 60),
            ("SQL", 55), ("Agile/Scrum", 55), ("API Testing", 50),
        ],
        "MID": [
            ("Test Automation", 75), ("Selenium/Playwright", 75), ("API Testing", 75),
            ("Test Planning", 70), ("CI/CD", 65), ("Performance Testing", 65),
        ],
        "SENIOR": [
            ("Test Strategy", 90), ("Test Automation", 85), ("Performance Testing", 80),
            ("Security Testing", 75), ("Quality Metrics", 80), ("Leadership", 75),
        ],
    },
    "Cybersecurity Analyst": {
        "JUNIOR": [
            ("Networking Basics", 65), ("Linux", 60), ("Security Fundamentals", 65),
            ("SIEM & Log Analysis", 55), ("Incident Response", 55), ("Communication", 50),
        ],
        "MID": [
            ("SIEM & Log Analysis", 75), ("Incident Response", 75), ("Vulnerability Assessment", 75),
            ("Network Security", 75), ("Threat Intelligence", 65), ("Python", 65),
        ],
        "SENIOR": [
            ("Threat Hunting", 85), ("Penetration Testing", 80), ("Security Architecture", 85),
            ("Incident Response", 90), ("Compliance (ISO 27001)", 75), ("Leadership", 75),
        ],
    },
    "Cloud Engineer": {
        "JUNIOR": [
            ("Linux", 65), ("Networking Basics", 60), ("Cloud (AWS/GCP)", 65),
            ("Git", 55), ("Bash Scripting", 55), ("Docker", 50),
        ],
        "MID": [
            ("Cloud (AWS/GCP)", 80), ("Terraform", 75), ("Kubernetes", 70),
            ("CI/CD", 70), ("Monitoring & Logging", 70), ("Networking Basics", 70),
        ],
        "SENIOR": [
            ("Cloud Architecture", 90), ("Kubernetes", 85), ("Infrastructure as Code", 85),
            ("Cost Optimization", 80), ("Security & Compliance", 80), ("Multi-cloud Strategy", 75),
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
    "Figma": ["Figma UI UX Design Essentials — Udemy"],
    "Wireframing": ["Google UX Design Certificate — Coursera"],
    "UI Design Principles": ["Google UX Design Certificate — Coursera"],
    "Typography & Color": ["Fundamentals of Graphic Design — CalArts (Coursera)"],
    "Prototyping": ["Create High-Fidelity Designs and Prototypes in Figma — Coursera"],
    "User Research": ["Conduct UX Research and Test Early Concepts — Coursera"],
    "Interaction Design": ["Interaction Design Specialization — UC San Diego (Coursera)"],
    "Design Systems": ["Design Systems with Figma — Frontend Masters"],
    "Usability Testing": ["User Experience Research and Design — UMich (Coursera)"],
    "Design Leadership": ["Design Leadership — LinkedIn Learning"],
    "Product Thinking": ["Product Management Fundamentals — Product School"],
    "Accessibility": ["Web Accessibility — Google (Udacity)"],
    "Linux": ["Introduction to Linux — edX", "Linux Journey — linuxjourney.com"],
    "Bash Scripting": ["Bash Scripting — freeCodeCamp"],
    "Networking Basics": ["The Bits and Bytes of Computer Networking — Google (Coursera)"],
    "Terraform": ["HashiCorp Terraform Associate Prep — KodeKloud"],
    "Monitoring & Logging": ["Prometheus & Grafana — Udemy"],
    "Infrastructure as Code": ["Terraform on AWS — Udemy"],
    "Cloud Architecture": ["AWS Solutions Architect — AWS Training"],
    "Site Reliability Engineering": ["Site Reliability Engineering — Google (sre.google)"],
    "Security & Compliance": ["AWS Security Fundamentals — AWS Training"],
    "Cost Optimization": ["AWS Cloud Financial Management — AWS Training"],
    "Multi-cloud Strategy": ["Multicloud Architecture — LinkedIn Learning"],
    "Requirement Gathering": ["Business Analysis Fundamentals — Udemy"],
    "Documentation": ["Technical Writing — Google Developers"],
    "Data Analysis": ["Google Data Analytics Certificate — Coursera"],
    "Business Process Modeling": ["BPMN 2.0 Business Process Modeling — Udemy"],
    "Problem Solving": ["Creative Problem Solving — University of Minnesota (Coursera)"],
    "Strategic Analysis": ["Business Strategy — University of Virginia (Coursera)"],
    "Data-Driven Decisions": ["Data-Driven Decision Making — PwC (Coursera)"],
    "Process Improvement": ["Six Sigma Yellow Belt — Coursera"],
    "Executive Communication": ["Executive Communication — LinkedIn Learning"],
    "Social Media Marketing": ["Meta Social Media Marketing — Coursera"],
    "Content Writing": ["Content Marketing — HubSpot Academy"],
    "SEO": ["SEO Specialization — UC Davis (Coursera)", "SEO Training — Ahrefs Academy"],
    "Google Analytics": ["Google Analytics 4 — Google Skillshop"],
    "Copywriting": ["Copywriting for Beginners — Udemy"],
    "SEM/Google Ads": ["Google Ads Certification — Google Skillshop"],
    "Content Strategy": ["Content Strategy for Professionals — Northwestern (Coursera)"],
    "Email Marketing": ["Email Marketing — HubSpot Academy"],
    "Marketing Analytics": ["Marketing Analytics — University of Virginia (Coursera)"],
    "Marketing Strategy": ["Digital Marketing Specialization — UIUC (Coursera)"],
    "Growth Marketing": ["Growth Series — Reforge"],
    "Brand Management": ["Brand Management — London Business School (Coursera)"],
    "Budget Management": ["Finance for Non-Financial Managers — LinkedIn Learning"],
    "HTML/CSS": ["Responsive Web Design — freeCodeCamp"],
    "API Basics": ["APIs for Beginners — freeCodeCamp"],
    "REST API Design": ["REST API Design Best Practices — Udemy"],
    "Testing": ["JavaScript Testing — freeCodeCamp"],
    "Architecture Patterns": ["Software Architecture Patterns — O'Reilly"],
    "DevOps Practices": ["DevOps Culture and Mindset — UC Berkeley (Coursera)"],
    "Security": ["Web Security Academy — PortSwigger"],
    "Data Structures": ["Data Structures & Algorithms — freeCodeCamp"],
    "Database Design": ["CS50 SQL — Harvard (edX)"],
    "Caching": ["Redis University — RU101"],
    "Microservices": ["Microservices Architecture — Udemy"],
    "Database Optimization": ["SQL Performance Tuning — Udemy"],
    "Message Queues": ["RabbitMQ & Kafka Fundamentals — Udemy"],
    "Responsive Design": ["Responsive Web Design — freeCodeCamp"],
    "Browser DevTools": ["Chrome DevTools — web.dev"],
    "Web Performance": ["Learn Performance — web.dev"],
    "CSS Architecture": ["CSS for JavaScript Developers — Josh Comeau"],
    "Frontend Architecture": ["Frontend System Design — Frontend Masters"],
    "State Management": ["Redux Essentials — redux.js.org"],
    "Programming Fundamentals": ["CS50x — Harvard (edX)"],
    "Kotlin/Swift": ["Belajar Membuat Aplikasi Android untuk Pemula — Dicoding", "100 Days of SwiftUI — Hacking with Swift"],
    "UI Layout": ["Belajar Fundamental Aplikasi Android — Dicoding"],
    "Flutter/React Native": ["Belajar Membuat Aplikasi Flutter untuk Pemula — Dicoding"],
    "REST API Integration": ["Working with REST APIs — LinkedIn Learning"],
    "App Performance": ["Android Performance — Google Developers"],
    "Mobile Architecture": ["Guide to App Architecture — developer.android.com"],
    "Cross-platform Strategy": ["Kotlin Multiplatform — JetBrains Academy"],
    "Feature Engineering": ["Feature Engineering — Kaggle Learn"],
    "Deep Learning": ["Deep Learning Specialization — Andrew Ng (Coursera)"],
    "MLOps": ["MLOps Specialization — DeepLearning.AI (Coursera)"],
    "Experiment Design": ["Experimentation for Improvement — McMaster (Coursera)"],
    "Big Data (Spark)": ["Apache Spark — Databricks Academy"],
    "Manual Testing": ["Software Testing Fundamentals — Udemy"],
    "Test Case Design": ["ISTQB Foundation Level Prep — Udemy"],
    "Bug Reporting": ["Bug Reporting Best Practices — Ministry of Testing"],
    "API Testing": ["API Testing with Postman — Udemy"],
    "Test Automation": ["Test Automation University — Applitools"],
    "Selenium/Playwright": ["Playwright Tutorial — Test Automation University"],
    "Test Planning": ["Test Management — LinkedIn Learning"],
    "Performance Testing": ["Performance Testing with k6 — Udemy"],
    "Test Strategy": ["Modern Test Strategy — Ministry of Testing"],
    "Security Testing": ["Web Security Testing — PortSwigger Academy"],
    "Quality Metrics": ["Software Quality Metrics — LinkedIn Learning"],
    "Security Fundamentals": ["Google Cybersecurity Certificate — Coursera"],
    "SIEM & Log Analysis": ["Splunk Fundamentals — Splunk Education"],
    "Incident Response": ["Cyber Incident Response — Infosec (Coursera)"],
    "Vulnerability Assessment": ["Nessus Essentials — Tenable University"],
    "Network Security": ["Network Security — Cisco Networking Academy"],
    "Threat Intelligence": ["Cyber Threat Intelligence — IBM (Coursera)"],
    "Threat Hunting": ["Cyber Threat Hunting — Infosec (Coursera)"],
    "Penetration Testing": ["Jr Penetration Tester Path — TryHackMe"],
    "Security Architecture": ["Cybersecurity Architecture — IBM (Coursera)"],
    "Compliance (ISO 27001)": ["ISO 27001 Foundation — Udemy"],
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
    # 15 role preset frontend punya entry sendiri; default Software Engineer
    # hanya kepakai sebagai safety net untuk role custom yang diketik manual.
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
