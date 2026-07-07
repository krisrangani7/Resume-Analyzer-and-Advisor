import { useEffect, useState } from "react";
import { createJob, listJobs, uploadResumes, runShortlist, getResults } from "../api/client.js";
import MatchMeter from "../components/MatchMeter.jsx";

const emptyJob = {
  title: "",
  description: "",
  required_skills: "",
  min_experience_years: 0,
  education_requirement: "",
  must_have_keywords: "",
};

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [form, setForm] = useState(emptyJob);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listJobs().then(setJobs).catch(() => setError("Could not reach the API. Is the backend running?"));
  }, []);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  async function handleCreateJob(e) {
    e.preventDefault();
    setError("");
    setBusy("Creating role...");
    try {
      const job = await createJob({
        ...form,
        required_skills: form.required_skills.split(",").map((s) => s.trim()).filter(Boolean),
        must_have_keywords: form.must_have_keywords.split(",").map((s) => s.trim()).filter(Boolean),
        min_experience_years: Number(form.min_experience_years) || 0,
      });
      setJobs((prev) => [job, ...prev]);
      setSelectedJobId(job.id);
      setForm(emptyJob);
    } catch {
      setError("Couldn't create the role. Check the backend logs.");
    } finally {
      setBusy("");
    }
  }

  async function handleUpload() {
    if (!selectedJobId || files.length === 0) return;
    setError("");
    setBusy(`Parsing and indexing ${files.length} resume(s)...`);
    try {
      await uploadResumes(selectedJobId, files);
      setFiles([]);
    } catch {
      setError("Upload failed. Check file formats (PDF, DOCX, or TXT only).");
    } finally {
      setBusy("");
    }
  }

  async function handleShortlist() {
    if (!selectedJobId) return;
    setError("");
    setBusy("Scoring candidates against role criteria...");
    try {
      const data = await runShortlist(selectedJobId);
      setResults(data);
    } catch {
      setError("Shortlisting failed. Make sure resumes were uploaded first.");
    } finally {
      setBusy("");
    }
  }

  async function loadResults(jobId) {
    setSelectedJobId(jobId);
    setResults([]);
    try {
      const data = await getResults(jobId);
      setResults(data);
    } catch {
      /* no results yet, fine */
    }
  }

  const shortlistedCount = results.filter((r) => r.shortlisted).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[320px_1fr] gap-8">
      {/* Left: role setup */}
      <aside className="space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-recruiter mb-2">
            Step 1
          </p>
          <h2 className="font-display text-xl mb-4">Define the role</h2>
          <form onSubmit={handleCreateJob} className="space-y-3">
            <input
              required
              placeholder="Job title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface"
            />
            <textarea
              placeholder="Description / responsibilities"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface"
            />
            <input
              placeholder="Required skills (comma separated)"
              value={form.required_skills}
              onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface"
            />
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="Minimum years experience"
              value={form.min_experience_years}
              onChange={(e) => setForm({ ...form, min_experience_years: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface"
            />
            <input
              placeholder="Education requirement"
              value={form.education_requirement}
              onChange={(e) => setForm({ ...form, education_requirement: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface"
            />
            <input
              placeholder="Must-have keywords (comma separated)"
              value={form.must_have_keywords}
              onChange={(e) => setForm({ ...form, must_have_keywords: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-recruiter text-white text-sm font-medium py-2.5 hover:opacity-90"
            >
              Create role
            </button>
          </form>
        </div>

        {jobs.length > 0 && (
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
              Existing roles
            </p>
            <ul className="space-y-1">
              {jobs.map((j) => (
                <li key={j.id}>
                  <button
                    onClick={() => loadResults(j.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedJobId === j.id
                        ? "bg-recruiter-soft text-recruiter font-medium"
                        : "hover:bg-recruiter-soft/50 text-ink"
                    }`}
                  >
                    {j.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Right: upload + results */}
      <section>
        {!selectedJob ? (
          <p className="text-muted text-sm">Create or select a role on the left to get started.</p>
        ) : (
          <>
            <div className="mb-8">
              <p className="font-mono text-xs uppercase tracking-widest text-recruiter mb-2">
                Step 2 · {selectedJob.title}
              </p>
              <h2 className="font-display text-xl mb-4">Upload resumes</h2>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setFiles(Array.from(e.target.files))}
                  className="text-sm"
                />
                <button
                  onClick={handleUpload}
                  disabled={files.length === 0}
                  className="rounded-lg bg-ink text-white text-sm font-medium px-4 py-2 disabled:opacity-30"
                >
                  Upload &amp; index
                </button>
              </div>
            </div>

            <div className="mb-8 flex items-center gap-3">
              <button
                onClick={handleShortlist}
                className="rounded-lg bg-recruiter text-white text-sm font-medium px-4 py-2.5 hover:opacity-90"
              >
                Run shortlist
              </button>
              {results.length > 0 && (
                <span className="font-mono text-xs text-muted">
                  {shortlistedCount} shortlisted of {results.length}
                </span>
              )}
            </div>

            {busy && <p className="text-sm text-muted mb-4 animate-pulse">{busy}</p>}
            {error && <p className="text-sm text-reject mb-4">{error}</p>}

            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
                    <button
                      className="w-full flex items-center justify-between gap-4 text-left"
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded-full ${
                            r.shortlisted ? "bg-recruiter-soft text-recruiter" : "bg-reject-soft text-reject"
                          }`}
                        >
                          {r.shortlisted ? "Shortlisted" : "Not a fit"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.candidate_name}</p>
                          <p className="text-xs text-muted truncate">{r.candidate_email}</p>
                        </div>
                      </div>
                      <MatchMeter score={r.match_score} shortlisted={r.shortlisted} />
                    </button>

                    {expanded === r.id && (
                      <div className="mt-4 pt-4 border-t border-border text-sm space-y-3">
                        <p className="text-ink leading-relaxed">{r.reasons}</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-wide text-recruiter mb-1">
                              Matched
                            </p>
                            <p className="text-muted">{r.skills_matched.join(", ") || "—"}</p>
                          </div>
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-wide text-reject mb-1">
                              Missing
                            </p>
                            <p className="text-muted">{r.skills_missing.join(", ") || "—"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
