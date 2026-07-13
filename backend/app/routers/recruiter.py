import concurrent.futures
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services import resume_parser, vector_service, llm_service

router = APIRouter(prefix="/recruiter", tags=["recruiter"])

BATCH_SIZE = 6  # resumes scored per LLM call
MAX_CONCURRENT_BATCHES = 3  # batches sent to Gemini at once


@router.post("/jobs", response_model=schemas.JobOut)
def create_job(payload: schemas.JobCreate, db: Session = Depends(get_db)):
    job = models.Job(**payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs", response_model=list[schemas.JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(models.Job).order_by(models.Job.created_at.desc()).all()


@router.get("/jobs/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.post("/jobs/{job_id}/resumes", response_model=list[schemas.CandidateOut])
async def upload_resumes(job_id: str, files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    created = []
    for f in files:
        raw = await f.read()
        try:
            text = resume_parser.extract_text(raw, f.filename)
        except ValueError as e:
            raise HTTPException(400, str(e))

        contact = resume_parser.quick_extract_contact(text)

        # Duplicate check
        existing = (
            db.query(models.Candidate)
            .filter(
                models.Candidate.job_id == job_id,
                models.Candidate.email == contact["email"],
            )
            .first()
        )

        if existing:
            created.append(existing)
            continue

        candidate = models.Candidate(
            job_id=job_id,
            name=contact["name_guess"],
            email=contact["email"],
            file_name=f.filename,
            resume_text=text,
            parsed_json=contact,
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)

        # Index into Pinecone for this job's namespace (RAG retrieval pool)
        vector_service.upsert_candidate(
            job_id=job_id,
            candidate_id=candidate.id,
            resume_text=text,
            metadata={"name": candidate.name, "email": candidate.email},
        )
        created.append(candidate)

    return created


def _score_batch(job_dict: dict, batch: list):
    payload = [{"id": c.id, "resume_text": c.resume_text} for c in batch]
    try:
        return llm_service.evaluate_candidates_batch(job_dict, payload)
    except Exception as e:
        print(f"Batch scoring failed, falling back to single calls: {e}")
        out = {}
        for c in batch:
            try:
                out[c.id] = llm_service.evaluate_candidate(job_dict, c.resume_text)
            except Exception as e2:
                print(f"Candidate {c.id} evaluation failed: {e2}")
        return out


@router.post("/jobs/{job_id}/shortlist", response_model=list[schemas.ShortlistResultOut])
def run_shortlist(job_id: str, top_k: int = 50, db: Session = Depends(get_db)):
    """RAG step: pull the most semantically relevant candidates from Pinecone,
    then have the LLM give an evidence-based verdict + reasons for each.
    Candidates are scored in small batches, run concurrently, instead of one
    LLM call per candidate — this is what makes shortlisting fast."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    job_dict = {
        "title": job.title,
        "description": job.description,
        "required_skills": job.required_skills or [],
        "min_experience_years": job.min_experience_years,
        "education_requirement": job.education_requirement,
        "must_have_keywords": job.must_have_keywords or [],
    }
    criteria_text = (
        f"{job.title}. {job.description}. "
        f"Required skills: {', '.join(job.required_skills or [])}. "
        f"Minimum experience: {job.min_experience_years} years. "
        f"Education: {job.education_requirement}."
    )

    matches = vector_service.query_top_candidates(job_id, criteria_text, top_k=top_k)
    matched_ids = [m["candidate_id"] for m in matches]

    candidates = db.query(models.Candidate).filter(models.Candidate.job_id == job_id).all()
    if matched_ids:
        candidates = [c for c in candidates if c.id in matched_ids] or candidates

    batches = [candidates[i:i + BATCH_SIZE] for i in range(0, len(candidates), BATCH_SIZE)]

    verdicts = {}
    if batches:
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_CONCURRENT_BATCHES) as pool:
            for batch_result in pool.map(lambda b: _score_batch(job_dict, b), batches):
                verdicts.update(batch_result)

    results = []
    for candidate in candidates:
        verdict = verdicts.get(candidate.id, {})

        existing = db.query(models.ShortlistResult).filter(
            models.ShortlistResult.candidate_id == candidate.id
        ).first()
        if not existing:
            existing = models.ShortlistResult(candidate_id=candidate.id, job_id=job_id)
            db.add(existing)

        existing.shortlisted = bool(verdict.get("shortlisted", False))
        existing.match_score = float(verdict.get("match_score", 0))
        existing.skills_matched = verdict.get("skills_matched", [])
        existing.skills_missing = verdict.get("skills_missing", [])
        existing.reasons = verdict.get("reasons", "")
        db.commit()
        db.refresh(existing)

        results.append(schemas.ShortlistResultOut(
            id=existing.id,
            candidate_id=candidate.id,
            candidate_name=candidate.name,
            candidate_email=candidate.email,
            shortlisted=existing.shortlisted,
            match_score=existing.match_score,
            skills_matched=existing.skills_matched,
            skills_missing=existing.skills_missing,
            reasons=existing.reasons,
        ))

    results.sort(key=lambda r: r.match_score, reverse=True)
    return results


@router.get("/jobs/{job_id}/results", response_model=list[schemas.ShortlistResultOut])
def get_results(job_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(models.ShortlistResult, models.Candidate)
        .join(models.Candidate, models.Candidate.id == models.ShortlistResult.candidate_id)
        .filter(models.ShortlistResult.job_id == job_id)
        .all()
    )
    results = [
        schemas.ShortlistResultOut(
            id=r.id, candidate_id=c.id, candidate_name=c.name, candidate_email=c.email,
            shortlisted=r.shortlisted, match_score=r.match_score,
            skills_matched=r.skills_matched, skills_missing=r.skills_missing, reasons=r.reasons,
        )
        for r, c in rows
    ]
    results.sort(key=lambda r: r.match_score, reverse=True)
    return results