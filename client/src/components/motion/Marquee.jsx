// A row that scrolls by on its own, round and round, and stops while the
// pointer is on it so a card can be read. The row is drawn twice, end to end,
// and moved back by exactly one copy, so the loop never shows a seam. Anyone
// who has asked for less motion gets the row standing still.
export default function Marquee({ children, seconds = 60, reverse = false, className = "", gap = "1.25rem" }) {
  return (
    <div className={`group/marquee relative overflow-hidden ${className}`}>
      <div
        className="flex w-max animate-marquee will-change-transform group-hover/marquee:[animation-play-state:paused] group-focus-within/marquee:[animation-play-state:paused]"
        style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        <div className="flex shrink-0" style={{ gap, paddingRight: gap }}>
          {children}
        </div>
        <div className="flex shrink-0" style={{ gap, paddingRight: gap }} aria-hidden="true" inert>
          {children}
        </div>
      </div>
    </div>
  );
}
