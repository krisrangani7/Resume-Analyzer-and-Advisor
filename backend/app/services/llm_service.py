"""All prompt construction + Gemini calls live here, so routers stay thin."""
import json
import re
import google.generativeai as genai
from app.config import settings
genai.configure(api_key=settings.gemini_api_key)
_model = genai.GenerativeModel(settings.gemini_model)
def _call_json(prompt: str) -> dict:
    """Calls Gemini and forces/parses a JSON response, stripping any stray
    markdown fences the model might add."""
    response = _model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"},
    )
    raw = response.text.strip()
    raw = re.sub(r"^```(json)?|```$", "", raw, flags=re.MULTILINE).strip()
    return json.loads(raw)
# ---------------- Recruiter side ----------------
def evaluate_candidate(job: dict, resume_text: str) -> dict:
    """Returns {shortlisted, match_score, skills_matched, skills_missing, reasons}."""
    prompt = f"""You are a strict but fair technical recruiter assistant.
JOB REQUIREMENTS:
- Title: {job['title']}
- Description: {job['description']}
- Required skills: {', '.join(job['required_skills']) or 'none specified'}
- Minimum experience (years): {job['min_experience_years']}
- Education requirement: {job['education_requirement'] or 'none specified'}
- Must-have keywords: {', '.join(job['must_have_keywords']) or 'none'}
CANDIDATE RESUME:
\"\"\"
{resume_text[:12000]}
\"\"\"
Evaluate this candidate against the job requirements. Be specific and evidence-based —
cite what's actually in the resume, don't assume things that aren't there.
Respond ONLY with JSON in exactly this shape:
{{
  "shortlisted": true or false,
  "match_score": number from 0 to 100,
  "skills_matched": ["skill1", "skill2"],
  "skills_missing": ["skill3"],
  "reasons": "2-4 sentence explanation of the decision, specific to this candidate"
}}"""
    return _call_json(prompt)
def evaluate_candidates_batch(job: dict, candidates: list[dict]) -> dict:
    """Scores several candidates in ONE call instead of one call each.
    candidates: [{"id": ..., "resume_text": ...}, ...]
    Returns {candidate_id: verdict_dict}."""
    blocks = "\n\n".join(
        f'--- CANDIDATE_ID: {c["id"]} ---\n"""\n{c["resume_text"][:6000]}\n"""'
        for c in candidates
    )
    prompt = f"""You are a strict but fair technical recruiter assistant.
JOB REQUIREMENTS:
- Title: {job['title']}
- Description: {job['description']}
- Required skills: {', '.join(job['required_skills']) or 'none specified'}
- Minimum experience (years): {job['min_experience_years']}
- Education requirement: {job['education_requirement'] or 'none specified'}
- Must-have keywords: {', '.join(job['must_have_keywords']) or 'none'}
Evaluate EACH candidate below independently against the job requirements.
Do not compare candidates to each other.
CANDIDATES:
{blocks}
Respond ONLY with JSON in exactly this shape, one entry per candidate_id above:
{{
  "results": [
    {{
      "candidate_id": "the exact CANDIDATE_ID given above",
      "shortlisted": true or false,
      "match_score": number from 0 to 100,
      "skills_matched": ["skill1", "skill2"],
      "skills_missing": ["skill3"],
      "reasons": "2-4 sentence explanation of the decision, specific to this candidate"
    }}
  ]
}}"""
    data = _call_json(prompt)
    return {r["candidate_id"]: r for r in data.get("results", []) if "candidate_id" in r}
# ---------------- Student side ----------------
def generate_resume(details: dict) -> str:
    prompt = f"""You are an expert resume writer. Write a complete, professional,
ATS-friendly resume in clean plain text (use simple headers in ALL CAPS,
dashes for bullet points, no markdown symbols like ** or #).
Candidate details (JSON):
{json.dumps(details, indent=2)}
Rules:
- If target_role is set, tailor the summary and bullet phrasing toward it.
- Turn plain descriptions into strong action-verb, quantified bullet points
  where reasonable, without inventing false facts or numbers.
- Keep it to roughly one page worth of content.
- Sections: header contact line, Summary, Skills, Experience, Projects,
  Education, Certifications — omit any section with no data.
Return only the resume text, nothing else."""
    response = _model.generate_content(prompt)
    return response.text.strip()
def critique_resume(resume_text: str, target_role: str = "") -> dict:
    prompt = f"""You are an expert resume reviewer and ATS (Applicant Tracking
System) specialist.
TARGET ROLE (may be blank): {target_role or 'not specified'}
RESUME TEXT:
\"\"\"
{resume_text[:12000]}
\"\"\"
Review this resume. Then rewrite an improved version that fixes the issues you find,
without inventing new facts, employers, degrees, or numbers that aren't implied
by the original.
Respond ONLY with JSON in exactly this shape:
{{
  "ats_score": integer 0-100,
  "strengths": ["...", "..."],
  "mistakes": ["specific mistake 1", "specific mistake 2"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2"],
  "improved_resume_text": "full rewritten resume as plain text"
}}"""
    return _call_json(prompt)