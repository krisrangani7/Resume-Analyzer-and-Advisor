from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------- Recruiter side ----------

class JobCreate(BaseModel):
    title: str
    description: str = ""
    required_skills: list[str] = Field(default_factory=list)
    min_experience_years: float = 0
    education_requirement: str = ""
    must_have_keywords: list[str] = Field(default_factory=list)


class JobOut(JobCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class CandidateOut(BaseModel):
    id: str
    job_id: str
    name: str
    email: str
    file_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class ShortlistResultOut(BaseModel):
    id: str
    candidate_id: str
    candidate_name: str
    candidate_email: str
    shortlisted: bool
    match_score: float
    skills_matched: list[str]
    skills_missing: list[str]
    reasons: str

    class Config:
        from_attributes = True


# ---------- Student side ----------

class ResumeGenerateRequest(BaseModel):
    full_name: str
    email: str = ""
    phone: str = ""
    target_role: str = ""
    summary: str = ""
    education: list[dict] = Field(default_factory=list)   # [{degree, school, year}]
    experience: list[dict] = Field(default_factory=list)  # [{title, company, duration, bullets:[...]}]
    projects: list[dict] = Field(default_factory=list)    # [{name, description}]
    skills: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


class ResumeGenerateResponse(BaseModel):
    id: str
    resume_text: str


class ResumeCritiqueResponse(BaseModel):
    id: str
    ats_score: int
    strengths: list[str]
    mistakes: list[str]
    suggestions: list[str]
    improved_resume_text: str
