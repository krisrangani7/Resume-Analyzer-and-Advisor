import { useState } from "react";
import { generateResume, critiqueResume } from "../api/client.js";
import ScoreRing from "../components/ScoreRing.jsx";

const emptyDetails = {
  full_name: "",
  email: "",
  phone: "",
  target_role: "",
  summary: "",
  education: [{ degree: "", school: "", year: "" }],
  experience: [{ title: "", company: "", duration: "", bullets: "" }],
  projects: [{ name: "", description: "" }],
  skills: "",
  certifications: "",
};

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function TextField({ label, ...props }) {
  return (
    <label className="block text-sm">
      <span className="text-muted text-xs">{label}</span>
      <input {...props} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface" />
    </label>
  );
}

function GenerateTab() {
  const [details, setDetails] = useState(emptyDetails);
  const [resumeText, setResumeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function updateList(field, index, key, value) {
    const next = [...details[field]];
    next[index] = { ...next[index], [key]: value };
    setDetails({ ...details, [field]: next });
  }
  function addRow(field, template) {
    setDetails({ ...details, [field]: [...details[field], template] });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = {
        ...details,
        skills: details.skills.split(",").map((s) => s.trim()).filter(Boolean),
        certifications: details.certifications.split(",").map((s) => s.trim()).filter(Boolean),
        experience: details.experience
          .filter((x) => x.title || x.company)
          .map((x) => ({ ...x, bullets: x.bullets.split("\n").map((b) => b.trim()).filter(Boolean) })),
        education: details.education.filter((x) => x.degree || x.school),
        projects: details.projects.filter((x) => x.name),
      };
      const data = await generateResume(payload);
      setResumeText(data.resume_text);
    } catch {
      setError("Couldn't generate the resume. Check the backend logs.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Full name"
            required
            value={details.full_name}
            onChange={(e) => setDetails({ ...details, full_name: e.target.value })}
          />
          <TextField
            label="Target role"
            value={details.target_role}
            onChange={(e) => setDetails({ ...details, target_role: e.target.value })}
          />
          <TextField
            label="Email"
            value={details.email}
            onChange={(e) => setDetails({ ...details, email: e.target.value })}
          />
          <TextField
            label="Phone"
            value={details.phone}
            onChange={(e) => setDetails({ ...details, phone: e.target.value })}
          />
        </div>

        <label className="block text-sm">
          <span className="text-muted text-xs">Summary (a few lines about you)</span>
          <textarea
            rows={2}
            value={details.summary}
            onChange={(e) => setDetails({ ...details, summary: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface"
          />
        </label>

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-student mb-2">Education</p>
          {details.education.map((row, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <input placeholder="Degree" value={row.degree} onChange={(e) => updateList("education", i, "degree", e.target.value)} className="rounded-lg border border-border px-2 py-1.5 text-sm bg-surface" />
              <input placeholder="School" value={row.school} onChange={(e) => updateList("education", i, "school", e.target.value)} className="rounded-lg border border-border px-2 py-1.5 text-sm bg-surface" />
              <input placeholder="Year" value={row.year} onChange={(e) => updateList("education", i, "year", e.target.value)} className="rounded-lg border border-border px-2 py-1.5 text-sm bg-surface" />
            </div>
          ))}
          <button type="button" onClick={() => addRow("education", { degree: "", school: "", year: "" })} className="text-xs text-student font-medium">
            + Add education
          </button>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-student mb-2">Experience</p>
          {details.experience.map((row, i) => (
            <div key={i} className="space-y-2 mb-3 rounded-lg border border-border p-3">
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Title" value={row.title} onChange={(e) => updateList("experience", i, "title", e.target.value)} className="rounded-lg border border-border px-2 py-1.5 text-sm bg-surface" />
                <input placeholder="Company" value={row.company} onChange={(e) => updateList("experience", i, "company", e.target.value)} className="rounded-lg border border-border px-2 py-1.5 text-sm bg-surface" />
              </div>
              <input placeholder="Duration (e.g. Jun 2024 - Aug 2024)" value={row.duration} onChange={(e) => updateList("experience", i, "duration", e.target.value)} className="w-full rounded-lg border border-border px-2 py-1.5 text-sm bg-surface" />
              <textarea placeholder="What did you do? One line per bullet point" rows={3} value={row.bullets} onChange={(e) => updateList("experience", i, "bullets", e.target.value)} className="w-full rounded-lg border border-border px-2 py-1.5 text-sm bg-surface" />
            </div>
          ))}
          <button type="button" onClick={() => addRow("experience", { title: "", company: "", duration: "", bullets: "" })} className="text-xs text-student font-medium">
            + Add experience
          </button>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-student mb-2">Projects</p>
          {details.projects.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 mb-2">
              <input placeholder="Project name" value={row.name} onChange={(e) => updateList("projects", i, "name", e.target.value)} className="rounded-lg border border-border px-2 py-1.5 text-sm bg-surface" />
              <input placeholder="One-line description" value={row.description} onChange={(e) => updateList("projects", i, "description", e.target.value)} className="rounded-lg border border-border px-2 py-1.5 text-sm bg-surface" />
            </div>
          ))}
          <button type="button" onClick={() => addRow("projects", { name: "", description: "" })} className="text-xs text-student font-medium">
            + Add project
          </button>
        </div>

        <TextField
          label="Skills (comma separated)"
          value={details.skills}
          onChange={(e) => setDetails({ ...details, skills: e.target.value })}
        />
        <TextField
          label="Certifications (comma separated)"
          value={details.certifications}
          onChange={(e) => setDetails({ ...details, certifications: e.target.value })}
        />

        <button type="submit" disabled={busy} className="rounded-lg bg-student text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 disabled:opacity-40">
          {busy ? "Writing your resume..." : "Generate resume"}
        </button>
        {error && <p className="text-sm text-reject">{error}</p>}
      </form>

      <div>
        {resumeText ? (
          <div className="rounded-xl border border-border bg-surface p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs uppercase tracking-widest text-student">Your resume</p>
              <button
                onClick={() => downloadText(`${details.full_name || "resume"}.txt`, resumeText)}
                className="text-xs font-medium text-student"
              >
                Download .txt
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-body">{resumeText}</pre>
          </div>
        ) : (
          <p className="text-sm text-muted">Fill in your details and your generated resume will appear here.</p>
        )}
      </div>
    </div>
  );
}

function CritiqueTab() {
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const data = await critiqueResume(file, targetRole);
      setResult(data);
    } catch {
      setError("Couldn't analyze that file. Try a PDF, DOCX, or TXT resume.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 mb-8">
        <label className="text-sm">
          <span className="text-muted text-xs block mb-1">Your resume file</span>
          <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
        </label>
        <TextField label="Target role (optional)" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
        <button type="submit" disabled={!file || busy} className="rounded-lg bg-student text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 disabled:opacity-40">
          {busy ? "Reviewing..." : "Analyze resume"}
        </button>
      </form>
      {error && <p className="text-sm text-reject mb-4">{error}</p>}

      {result && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <ScoreRing score={result.ats_score} />
              <p className="text-sm text-muted leading-relaxed">
                This score reflects how clearly an applicant tracking system —
                and a busy recruiter — could parse and match this resume.
              </p>
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-recruiter mb-2">Strengths</p>
              <ul className="text-sm space-y-1.5 list-disc list-inside text-ink">
                {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-reject mb-2">Mistakes found</p>
              <ul className="text-sm space-y-1.5 list-disc list-inside text-ink">
                {result.mistakes.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-student mb-2">Suggestions</p>
              <ul className="text-sm space-y-1.5 list-disc list-inside text-ink">
                {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs uppercase tracking-widest text-student">Rewritten resume</p>
              <button onClick={() => downloadText("improved_resume.txt", result.improved_resume_text)} className="text-xs font-medium text-student">
                Download .txt
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-body">{result.improved_resume_text}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const [tab, setTab] = useState("generate");

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-1 mb-10 font-mono text-xs uppercase tracking-wide">
        <button
          onClick={() => setTab("generate")}
          className={`px-4 py-2 rounded-full transition-colors ${tab === "generate" ? "bg-student text-white" : "text-muted hover:text-ink"}`}
        >
          Generate a resume
        </button>
        <button
          onClick={() => setTab("critique")}
          className={`px-4 py-2 rounded-full transition-colors ${tab === "critique" ? "bg-student text-white" : "text-muted hover:text-ink"}`}
        >
          Critique my resume
        </button>
      </div>

      {tab === "generate" ? <GenerateTab /> : <CritiqueTab />}
    </div>
  );
}
