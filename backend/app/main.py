from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.config import settings
from app.routers import recruiter, student

# Creates tables if they don't exist yet. For real migrations, swap for Alembic.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resume Analyzer & Advisor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recruiter.router)
app.include_router(student.router)


@app.get("/health")
def health():
    return {"status": "ok"}
