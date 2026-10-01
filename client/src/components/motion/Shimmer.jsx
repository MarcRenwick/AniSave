// A placeholder in the shape of what is loading, with a warm light sweeping
// across it (theme/harvest.css).
export function Shimmer({ className = "" }) {
  return <div className={`harvest-shimmer rounded-xl ${className}`} aria-hidden="true" />;
}

// A few rows of placeholders - a list or a table still on its way.
export function ShimmerRows({ rows = 4, className = "", label = "Loading..." }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-live="polite" data-testid="shimmer-rows">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Shimmer className="h-11 w-11 shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3 w-2/5" />
            <Shimmer className="h-3 w-3/5" />
          </div>
          <Shimmer className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
