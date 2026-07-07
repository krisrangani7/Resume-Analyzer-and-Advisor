# Resume Analyzer & Advisor

A full-stack AI platform with two products sharing one backend — a **Recruiter Dashboard** that shortlists candidates against a job's criteria using RAG, and a **Student Dashboard** that generates and critiques resumes using an LLM. Built with FastAPI, React, PostgreSQL, Pinecone, and the Gemini API.

---

## Features

### Recruiter Dashboard
- Create a job posting with required skills, minimum experience, education requirement, and must-have keywords
- Bulk upload resumes (PDF / DOCX / TXT) for a job in one request
- Each resume is parsed to text, embedded, and indexed into a job-scoped vector namespace
- Run a one-click **shortlist**: retrieves the most semantically relevant candidates via RAG, then asks the LLM for a structured, evidence-based verdict per candidate
- View persisted results any time — match score, matched/missing skills, and human-readable reasons — without re-running the LLM
- Results are automatically ranked by match score

### Student Dashboard
- **Generate mode** — fill in your details (education, experience, projects, skills) and get a full resume drafted from scratch
- **Critique mode** — upload an existing resume and get:
  - An ATS compatibility score
  - A list of strengths
  - A list of mistakes
  - Actionable suggestions
  - A rewritten, improved version of the resume

---

## Architecture

```
React (Vite)  →  FastAPI  →  PostgreSQL   (jobs, candidates, results, structured data)
                          →  Pinecone      (resume embeddings, per-job namespace, RAG retrieval)
                          →  Gemini API    (embeddings + shortlist reasoning + resume generation/critique)
```

**The RAG shortlisting loop:**
1. Every uploaded resume is parsed to plain text, embedded with Gemini (`text-embedding-004`), and upserted into Pinecone under a namespace scoped to that job.
2. Running "shortlist" embeds the job's criteria as a query, retrieves the most semantically relevant candidates from that namespace, then asks Gemini for a structured, evidence-based verdict (score, matched/missing skills, reasons) for each one.
3. Results are stored in PostgreSQL so they persist and can be re-fetched instantly, without re-running the LLM.

---

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | React (Vite), Tailwind CSS, Axios, React Router |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Vector Database | Pinecone (per-job namespaces for RAG) |
| LLM / Embeddings | Google Gemini (`gemini-2.5-flash`, `text-embedding-004`) |
| Resume Parsing | pdfplumber (PDF), python-docx (DOCX) |
| Containerization | Docker Compose (PostgreSQL) |

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A PostgreSQL instance (or use the included `docker-compose.yml`)
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)
- A [Pinecone](https://www.pinecone.io/) API key

### 1. Start PostgreSQL
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in GEMINI_API_KEY and PINECONE_API_KEY
uvicorn app.main:app --reload --port 8000
```
API runs at `http://localhost:8000` (interactive docs at `/docs`). Tables are created automatically on startup; the Pinecone index is created automatically on first use.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. It talks to the backend at `http://localhost:8000` by default — override with a `VITE_API_URL` env var if needed.

### Environment Variables (`backend/.env`)
```properties
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/resume_analyzer

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=resume-analyzer
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

CORS_ORIGINS=http://localhost:5173
UPLOAD_DIR=./uploads
```

---

## API Endpoints

### Recruiter APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/recruiter/jobs` | Create a new job with shortlisting criteria |
| GET | `/recruiter/jobs` | List all jobs |
| GET | `/recruiter/jobs/{job_id}` | Get a single job |
| POST | `/recruiter/jobs/{job_id}/resumes` | Upload one or more resumes for a job |
| POST | `/recruiter/jobs/{job_id}/shortlist` | Run the RAG shortlisting pipeline |
| GET | `/recruiter/jobs/{job_id}/results` | Fetch persisted shortlist results |

### Student APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/student/resume/generate` | Generate a resume from structured form data |
| POST | `/student/resume/critique` | Upload a resume and get an ATS score, mistakes, and an improved version |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Basic service health check |

---

## Request Examples

### Create a Job (Recruiter)
```
POST /recruiter/jobs
Content-Type: application/json

{
    "title": "Backend Engineer",
    "description": "Looking for a backend engineer with API and cloud experience.",
    "required_skills": ["python", "fastapi", "postgresql"],
    "min_experience_years": 2,
    "education_requirement": "Bachelor's in CS or related field",
    "must_have_keywords": ["REST API"]
}
```

### Upload Resumes (Recruiter)
```
POST /recruiter/jobs/{job_id}/resumes
Content-Type: multipart/form-data

files: resume1.pdf, resume2.docx
```

### Run Shortlist (Recruiter)
```
POST /recruiter/jobs/{job_id}/shortlist?top_k=50
```

Response:
```json
[
    {
        "id": "b1e2...",
        "candidate_id": "a9f3...",
        "candidate_name": "Jane Doe",
        "candidate_email": "jane@example.com",
        "shortlisted": true,
        "match_score": 88.5,
        "skills_matched": ["python", "fastapi"],
        "skills_missing": ["postgresql"],
        "reasons": "Strong backend experience with 2 relevant internships..."
    }
]
```

### Generate a Resume (Student)
```
POST /student/resume/generate
Content-Type: application/json

{
    "full_name": "John Smith",
    "email": "john@example.com",
    "target_role": "Frontend Developer",
    "education": [{"degree": "B.Tech CSE", "school": "XYZ University", "year": "2026"}],
    "experience": [{"title": "Intern", "company": "ABC Corp", "duration": "6 months", "bullets": ["Built React components"]}],
    "skills": ["React", "JavaScript", "Tailwind CSS"]
}
```

### Critique a Resume (Student)
```
POST /student/resume/critique
Content-Type: multipart/form-data

file: my_resume.pdf
target_role: Frontend Developer
```

---

## Project Structure
```
resume-analyzer/
│
├── docker-compose.yml            # PostgreSQL container
│
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py                 # FastAPI app, CORS, router registration
│       ├── config.py                # env-driven settings
│       ├── database.py               # SQLAlchemy engine/session
│       ├── models.py                  # Job, Candidate, ShortlistResult, GeneratedResume
│       ├── schemas.py                  # Pydantic request/response models
│       ├── routers/
│       │   ├── recruiter.py              # job CRUD, resume upload, shortlist, results
│       │   └── student.py                 # resume generation, resume critique
│       └── services/
│           ├── resume_parser.py            # PDF/DOCX/TXT text extraction
│           ├── vector_service.py            # Gemini embeddings + Pinecone upsert/query
│           └── llm_service.py                # Gemini prompts for shortlisting & resume writing
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        │   └── client.js                    # axios wrapper for every endpoint
        ├── pages/
        │   ├── Home.jsx                        # role picker landing page
        │   ├── RecruiterDashboard.jsx            # job setup, upload, shortlist, results
        │   └── StudentDashboard.jsx                # generate / critique tabs
        └── components/
            ├── MatchMeter.jsx                       # segmented match-score bar
            └── ScoreRing.jsx                          # ATS score ring
```

---

## What's Deliberately Simplified (Next Steps for Production)

- **Auth** — no login/user model yet. Add recruiter/student accounts and scope jobs and generated resumes to a `user_id`.
- **Migrations** — tables are created with `Base.metadata.create_all`; swap in Alembic once the schema stabilizes.
- **File storage** — uploaded resume bytes aren't persisted to disk/S3, only the extracted text. Add blob storage to re-download originals.
- **Background jobs** — shortlisting runs synchronously in the request; for large batches, move it to a task queue (Celery/RQ) and poll for status.
- **Structured resume parsing** — contact extraction currently only captures name/email/phone via regex. This can be extended to have Gemini return structured fields (skills, years of experience, degrees) at upload time.

---

## License

This project is open source and available for personal and educational use.
