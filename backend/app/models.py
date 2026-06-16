from sqlalchemy import Column, Integer, String, ForeignKey, Float, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="JOBSEEKER")
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
