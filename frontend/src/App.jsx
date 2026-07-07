import { Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import RecruiterDashboard from "./pages/RecruiterDashboard.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";

function TopBar() {
  const location = useLocation();
  const onRecruiter = location.pathname.startsWith("/recruiter");
  const onStudent = location.pathname.startsWith("/student");

  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display text-lg tracking-tight">
          Resume Analyzer <span className="text-muted">&amp; Advisor</span>
        </Link>
        <nav className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide">
          <Link
            to="/recruiter"
            className={`px-3 py-1.5 rounded-full transition-colors ${
              onRecruiter ? "bg-recruiter text-white" : "text-muted hover:text-ink"
            }`}
          >
            Recruiter
          </Link>
          <Link
            to="/student"
            className={`px-3 py-1.5 rounded-full transition-colors ${
              onStudent ? "bg-student text-white" : "text-muted hover:text-ink"
            }`}
          >
            Student
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recruiter" element={<RecruiterDashboard />} />
          <Route path="/student" element={<StudentDashboard />} />
        </Routes>
      </main>
    </div>
  );
}
