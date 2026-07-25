from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="JOBSEEKER")
    phone = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    target_role = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    cv_data = relationship("CVData", back_populates="owner")
    analysis_results = relationship("AnalysisResult", back_populates="user")

class CVData(Base):
    __tablename__ = "cv_data"

    id = Column(Integer, primary_key=True, index=True)
    extracted_text = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="cv_data")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    match_score = Column(Float)
    target_role = Column(String, default="")
    level = Column(String, default="MID")
    missing_skills = Column(Text)
    skill_details = Column(Text)
    recommended_courses = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="analysis_results")

class JobRole(Base):
    __tablename__ = "job_roles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # company owner
    title = Column(String)
    level = Column(String, default="MID")
    required_skills = Column(Text)  # comma-separated
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Invite(Base):
    __tablename__ = "invites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # company owner
    token = Column(String, unique=True, index=True)
    target_role = Column(String)
    level = Column(String, default="MID")
    candidate_email = Column(String, nullable=True)
    candidate_name = Column(String, nullable=True)
    status = Column(String, default="PENDING")  # PENDING | COMPLETED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
