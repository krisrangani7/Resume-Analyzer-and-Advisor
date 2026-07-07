export default function MatchMeter({ score, shortlisted }) {
  const accent = shortlisted ? "bg-recruiter" : "bg-reject";
  const segments = 20;
  const filled = Math.round((score / 100) * segments);

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-[2px]">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={`h-4 w-1 rounded-full ${i < filled ? accent : "bg-border"}`}
          />
        ))}
      </div>
      <span className="font-mono text-xs tabular-nums text-muted w-9 text-right">
        {Math.round(score)}
      </span>
    </div>
  );
}
