# Resume Analyzer & Advisor

Two products sharing one backend:

- **Recruiter dashboard** — define a role's shortlisting criteria, upload a
  batch of resumes, and get a ranked shortlist where every accept/reject
  decision comes with specific, evidence-based reasons.
- **Student dashboard** — fill in your details and get a full resume drafted
  from scratch, or upload an existing resume to get an ATS score, a mistake
  list, and a rewritten improved version.

## Architecture

```
React (Vite)  →  FastAPI  →  PostgreSQL   (jobs, candidates, results, structured data)
                          →  Pinecone      (resume embeddings, per-job namespace, RAG retrieval)
                          →  Gemini API    (embeddings + shortlist reasoning + resume generation/critique)
```

The RAG loop for shortlisting works like this:
1. Each uploaded resume is parsed to text, embedded with Gemini
   (`text-embedding-004`), and upserted into Pinecone under a namespace
   scoped to that job.
2. Running "shortlist" embeds the job's criteria as a query, retrieves the
   most semantically relevant candidates from that namespace, then asks
   Gemini to give a structured, evidence-based verdict (score, matched/missing
   skills, reasons) for each one.
3. Results are stored in Postgres so they persist and can be re-fetched
   without re-running the LLM.

## A note on the Gemini model

The backend defaults to **`gemini-2.5-flash`**, which is on Google's free tier
(with rate limits) as of mid-2026. Google deprecates and reprices Gemini
models fairly often, so if you hit errors or want the latest cost-effective
option, check https://ai.google.dev/gemini-api/docs/pricing and change
`GEMINI_MODEL` in your `.env` — no code changes needed.

## Prerequisites

- Python 3.11+
- Node.js 18+
- A Postgres instance (or use the included `docker-compose.yml`)
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)
- A [Pinecone](https://www.pinecone.io/) API key

## 1. Start Postgres

```bash
docker compose up -d
```

## 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # then fill in GEMINI_API_KEY and PINECONE_API_KEY
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (interactive docs at `/docs`).
Tables are created automatically on startup; the Pinecone index is created
automatically on first use.

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. It talks to the backend at
`http://localhost:8000` by default — override with a `VITE_API_URL` env var
if needed.

## Project layout

```
backend/
  app/
    main.py            FastAPI app, CORS, router registration
    config.py           env-driven settings
    database.py          SQLAlchemy engine/session
    models.py             Job, Candidate, ShortlistResult, GeneratedResume
    schemas.py             Pydantic request/response models
    routers/
      recruiter.py          job CRUD, resume upload, shortlist, results
      student.py             resume generation, resume critique
    services/
      resume_parser.py       PDF/DOCX/TXT text extraction
      vector_service.py       Gemini embeddings + Pinecone upsert/query
      llm_service.py           Gemini prompts for shortlisting & resume writing

frontend/
  src/
    pages/Home.jsx               role picker landing page
    pages/RecruiterDashboard.jsx   job setup, upload, shortlist, results
    pages/StudentDashboard.jsx      generate / critique tabs
    components/MatchMeter.jsx        segmented match-score bar
    components/ScoreRing.jsx          ATS score ring
    api/client.js                     axios wrapper for every endpoint
```

## What's deliberately simplified (next steps for production)

- **Auth** — there's no login/user model yet. Add recruiter/student accounts
  and scope jobs and generated resumes to a `user_id`.
- **Migrations** — tables are created with `Base.metadata.create_all`; swap in
  Alembic once the schema stabilizes.
- **File storage** — uploaded resume bytes aren't persisted to disk/S3, only
  the extracted text. Add blob storage if you need to re-download originals.
- **Background jobs** — shortlisting runs synchronously in the request; for
  large batches, move it to a task queue (Celery/RQ) and poll for status.
- **Structured resume parsing** — `parsed_json` currently only captures a
  name/email/phone guess via regex. You can extend `resume_parser.py` or ask
  Gemini to also return structured fields (skills, years of experience,
  degrees) at upload time so shortlisting doesn't rely purely on raw text.
