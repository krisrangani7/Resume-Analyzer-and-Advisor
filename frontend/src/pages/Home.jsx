import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
        Two sides of the same desk
      </p>
      <h1 className="font-display text-5xl leading-[1.05] max-w-2xl mb-6">
        Read every resume like you have all the time in the world.
      </h1>
      <p className="text-muted max-w-xl mb-14 leading-relaxed">
        One engine, two jobs: it screens a stack of resumes against a role's real
        requirements and tells you exactly why each person was or wasn't a fit —
        and it helps a student build a resume worth screening in the first place.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <Link
          to="/recruiter"
          className="group block rounded-2xl border border-border bg-surface p-8 hover:border-recruiter transition-colors"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-recruiter">
            For recruiters
          </span>
          <h2 className="font-display text-2xl mt-3 mb-3">Shortlist with receipts</h2>
          <p className="text-muted text-sm leading-relaxed mb-6">
            Define the criteria for a role, drop in a stack of resumes, and get a
            ranked shortlist — every accept and every reject comes with the
            specific reasons behind it.
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-recruiter">
            Open recruiter dashboard
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </Link>

        <Link
          to="/student"
          className="group block rounded-2xl border border-border bg-surface p-8 hover:border-student transition-colors"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-student">
            For students
          </span>
          <h2 className="font-display text-2xl mt-3 mb-3">Build or fix your resume</h2>
          <p className="text-muted text-sm leading-relaxed mb-6">
            Fill in your details and get a full resume drafted from scratch, or
            upload what you already have and get a line-by-line critique plus a
            rewritten, stronger version.
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-student">
            Open student dashboard
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
