from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services import resume_parser, llm_service

router = APIRouter(prefix="/student", tags=["student"])


@router.post("/resume/generate", response_model=schemas.ResumeGenerateResponse)
def generate_resume(payload: schemas.ResumeGenerateRequest, db: Session = Depends(get_db)):
    resume_text = llm_service.generate_resume(payload.model_dump())

    record = models.GeneratedResume(
        student_name=payload.full_name,
        mode="generate",
        input_data=payload.model_dump(),
        output_text=resume_text,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return schemas.ResumeGenerateResponse(id=record.id, resume_text=resume_text)


@router.post("/resume/critique", response_model=schemas.ResumeCritiqueResponse)
async def critique_resume(
    file: UploadFile = File(...),
    target_role: str = Form(""),
    db: Session = Depends(get_db),
):
    raw = await file.read()
    try:
        text = resume_parser.extract_text(raw, file.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))

    if not text.strip():
        raise HTTPException(400, "Could not extract any text from that file.")

    verdict = llm_service.critique_resume(text, target_role=target_role)

    record = models.GeneratedResume(
        student_name="",
        mode="critique",
        input_data={"original_text": text, "target_role": target_role},
        output_text=verdict.get("improved_resume_text", ""),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return schemas.ResumeCritiqueResponse(
        id=record.id,
        ats_score=int(verdict.get("ats_score", 0)),
        strengths=verdict.get("strengths", []),
        mistakes=verdict.get("mistakes", []),
        suggestions=verdict.get("suggestions", []),
        improved_resume_text=verdict.get("improved_resume_text", ""),
    )
