from pydantic import BaseModel
from typing import Optional

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "JOBSEEKER"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    target_role: Optional[str] = None
    experience_level: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class AnalyzeRequest(BaseModel):
    cv_id: int
    target_role: str
    level: str = "MID"

class SkillGap(BaseModel):
    skill: str
    current: float
    required: float
    gap: float
    priority: str

class AnalysisResponse(BaseModel):
    id: int
    match_score: float
    target_role: str
    level: str
    skills: list[SkillGap]
    missing_skills: list[str]
    recommended_courses: list[str]
    created_at: Optional[str] = None

class DashboardOverview(BaseModel):
    match_score: float
    skills_analyzed: int
    gaps_found: int
    total_analyses: int
    recent_analyses: list[dict]
    top_gaps: list[SkillGap]
