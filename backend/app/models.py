import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Text, Float, Boolean, Integer, ForeignKey, DateTime, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Job(Base):
    """A shortlisting request created by a recruiter for a role."""
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    required_skills = Column(JSON, default=list)       # ["python", "react", ...]
    min_experience_years = Column(Float, default=0)
    education_requirement = Column(String, default="")
    must_have_keywords = Column(JSON, default=list)     # hard filters
    created_at = Column(DateTime, default=datetime.utcnow)

    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")


class Candidate(Base):
    """A resume submitted against a specific job."""
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, default=gen_uuid)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    name = Column(String, default="Unknown")
    email = Column(String, default="")
    file_name = Column(String, default="")
    resume_text = Column(Text, default="")
    parsed_json = Column(JSON, default=dict)   # structured extraction (skills, experience, education)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="candidates")
    result = relationship("ShortlistResult", back_populates="candidate", uselist=False, cascade="all, delete-orphan")


class ShortlistResult(Base):
    """LLM verdict for one candidate against one job."""
    __tablename__ = "shortlist_results"

    id = Column(String, primary_key=True, default=gen_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False, unique=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    shortlisted = Column(Boolean, default=False)
    match_score = Column(Float, default=0.0)          # 0-100, from vector similarity + LLM
    skills_matched = Column(JSON, default=list)
    skills_missing = Column(JSON, default=list)
    reasons = Column(Text, default="")                 # human-readable explanation
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="result")


class GeneratedResume(Base):
    """Resumes generated for / critiqued for students."""
    __tablename__ = "generated_resumes"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_name = Column(String, default="")
    mode = Column(String, default="generate")   # "generate" | "critique"
    input_data = Column(JSON, default=dict)     # form details or uploaded resume text
    output_text = Column(Text, default="")       # generated resume or critique
    created_at = Column(DateTime, default=datetime.utcnow)
