import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// ---------- Recruiter ----------
export const createJob = (data) => api.post("/recruiter/jobs", data).then((r) => r.data);
export const listJobs = () => api.get("/recruiter/jobs").then((r) => r.data);
export const uploadResumes = (jobId, files) => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return api
    .post(`/recruiter/jobs/${jobId}/resumes`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
export const runShortlist = (jobId) =>
  api.post(`/recruiter/jobs/${jobId}/shortlist`).then((r) => r.data);
export const getResults = (jobId) =>
  api.get(`/recruiter/jobs/${jobId}/results`).then((r) => r.data);

// ---------- Student ----------
export const generateResume = (data) =>
  api.post("/student/resume/generate", data).then((r) => r.data);
export const critiqueResume = (file, targetRole) => {
  const form = new FormData();
  form.append("file", file);
  form.append("target_role", targetRole || "");
  return api
    .post("/student/resume/critique", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
