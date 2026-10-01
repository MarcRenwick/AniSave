import { useId } from "react";

// One drawing per marketplace category, for the landing page's category
// cards - flat shapes with a little light on them, no photos needed.

export function VegetableArt({ className = "" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}l`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#256a2b" />
          <stop offset="1" stopColor="#88bf8d" />
        </linearGradient>
        <linearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9b5bb0" />
          <stop offset="1" stopColor="#4a1d5c" />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f6a04d" />
          <stop offset="1" stopColor="#e4572e" />
        </linearGradient>
      </defs>
      {/* Leafy greens behind. */}
      {[-48, -22, 4, 30, 54].map((r, i) => (
        <g key={r} transform={`rotate(${r} 100 170)`}>
          <path d="M100 170C82 132 84 82 100 40c16 42 18 92 0 130z" fill={`url(#${id}l)`} opacity={i % 2 ? 0.95 : 0.8} />
          <path d="M100 166V50" stroke="#d9ebd9" strokeOpacity="0.55" strokeWidth="2" />
        </g>
      ))}
      {/* A carrot - root crops sell with the vegetables. */}
      <path d="M118 176L156 100c4-8 15-5 13 4l-38 78c-4 7-16 3-13-6z" fill={`url(#${id}c)`} />
      <path d="M141 140l9 4M134 154l8 4M148 124l7 3" stroke="#a03516" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      <path d="M164 100c-2-12 2-22 12-26M165 101c6-9 14-12 23-10M163 99c-9-6-12-14-10-23" stroke="#3b8a43" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* An eggplant in front. */}
      <path d="M52 158c-22-26-14-68 18-76 26-6 44 14 38 40-6 30-34 58-56 36z" fill={`url(#${id}e)`} />
      <path d="M62 112c4-12 14-20 24-21" stroke="#fff" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M86 84c4-8 14-12 22-8-2 6-8 10-14 11 6 2 9 7 8 12-8-1-14-5-16-11" fill="#2e7d32" />
      <path d="M100 78c4-6 10-9 16-9" stroke="#2e7d32" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function FruitArt({ className = "" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}m`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffe9a3" />
          <stop offset="0.5" stopColor="#f2b544" />
          <stop offset="1" stopColor="#e4572e" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#e8a33d" />
        </linearGradient>
      </defs>
      {/* Bananas. */}
      {[
        "M116 42C164 52 188 92 180 134c-2 8-10 8-12 0 2-34-12-64-52-92z",
        "M116 42c34 18 48 66 32 108-4 8-12 6-12-2 12-36 4-72-20-106z",
        "M116 42c24 24 30 70 12 110-4 8-12 6-12-2 12-36 12-72 0-108z",
      ].map((d) => (
        <path key={d} d={d} fill={`url(#${id}b)`} stroke="#c98521" strokeOpacity="0.5" strokeWidth="1.5" />
      ))}
      <path d="M116 42c2-8 8-12 16-10" stroke="#5c3d2e" strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* A mango in front. */}
      <g transform="rotate(-24 82 118)">
        <path d="M82 62c32 0 52 24 52 54 0 28-20 46-48 46-32 0-54-22-54-50 0-30 20-50 50-50z" fill={`url(#${id}m)`} />
        <ellipse cx="62" cy="88" rx="14" ry="7" fill="#fff" opacity="0.35" transform="rotate(-30 62 88)" />
      </g>
      <path d="M80 66c2-12 14-20 30-18-4 14-16 20-30 18z" fill="#2e7d32" />
      {/* Calamansi. */}
      <circle cx="146" cy="160" r="15" fill="#7cbf3f" />
      <circle cx="168" cy="150" r="11" fill="#f2c14e" />
      <circle cx="142" cy="155" r="4" fill="#d9f2a0" opacity="0.8" />
    </svg>
  );
}

export function EggArt({ className = "" }) {
  const id = useId();
  const eggs = [
    [64, 92, "#f6e4cc"],
    [100, 88, "#e9c9a0"],
    [136, 92, "#f6e4cc"],
    [70, 128, "#e9c9a0"],
    [106, 124, "#dfe9ea"],
    [142, 128, "#f6e4cc"],
  ];
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9a68a" />
          <stop offset="1" stopColor="#8a5a3c" />
        </linearGradient>
      </defs>
      {/* The tray, in perspective. */}
      <path d="M28 120L50 62h100l22 58-14 52H42z" fill={`url(#${id}t)`} />
      <path d="M42 172h116" stroke="#5c3d2e" strokeOpacity="0.4" strokeWidth="3" />
      {eggs.map(([x, y, color]) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={y + 14} rx="15" ry="6" fill="#5c3d2e" opacity="0.35" />
          <ellipse cx={x} cy={y} rx="14" ry="18" fill={color} />
          <ellipse cx={x - 5} cy={y - 6} rx="4" ry="6" fill="#fff" opacity="0.6" />
        </g>
      ))}
    </svg>
  );
}

export function MeatArt({ className = "" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}m`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#e2646a" />
          <stop offset="0.6" stopColor="#b5303a" />
          <stop offset="1" stopColor="#7a1820" />
        </radialGradient>
      </defs>
      {/* A cut with its fat rim, marbling and bone. */}
      <path d="M40 104c0-40 34-62 72-58 38 4 56 30 50 62-6 34-36 52-70 50-30-2-52-22-52-54z" fill="#f6e4cc" />
      <path d="M50 104c0-32 28-50 60-47 32 3 46 24 41 50-5 28-30 43-58 41-25-2-43-18-43-44z" fill={`url(#${id}m)`} />
      <path
        d="M70 92c10 4 18 2 26-4M84 118c12 2 22-2 30-10M110 78c6 6 14 8 22 6M66 124c6 8 14 12 24 12"
        stroke="#ffd9d0"
        strokeOpacity="0.55"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="124" cy="104" r="12" fill="#f6e4cc" />
      <circle cx="124" cy="104" r="5" fill="#e9c9a0" />
      {/* A sprig of herbs. */}
      <path d="M150 156c10-14 22-22 36-24" stroke="#3b8a43" strokeWidth="3" strokeLinecap="round" fill="none" />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={160 + i * 9} cy={146 - i * 5} rx="7" ry="3.4" fill="#58a061" transform={`rotate(${-40 + i * 6} ${160 + i * 9} ${146 - i * 5})`} />
      ))}
    </svg>
  );
}

export function SeafoodArt({ className = "" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe3e6" />
          <stop offset="0.55" stopColor="#7fbfc6" />
          <stop offset="1" stopColor="#3f8c95" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb08a" />
          <stop offset="1" stopColor="#e4572e" />
        </linearGradient>
      </defs>
      {/* A bangus (milkfish). */}
      <path d="M30 88c22-26 76-34 116-12l24-18-6 32 6 30-24-16c-40 22-94 14-116-16z" fill={`url(#${id}f)`} />
      <path d="M72 70c8 8 10 26 0 36M96 68c6 10 8 26 0 38M120 72c4 10 4 24-2 34" stroke="#2c6f77" strokeOpacity="0.35" strokeWidth="2" fill="none" />
      <path d="M58 64c14-10 30-14 46-12-10 6-24 10-46 12z" fill="#3f8c95" />
      <circle cx="46" cy="86" r="5" fill="#0f2418" />
      <circle cx="44.5" cy="84.5" r="1.6" fill="#fff" />
      <path d="M38 98c8 4 18 4 26 0" stroke="#2c6f77" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* A shrimp, curled. */}
      <path d="M112 132c26-6 46 6 46 26 0 18-18 26-30 18 10-2 16-8 14-16-2-10-16-14-30-10z" fill={`url(#${id}s)`} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${124 + i * 9} ${131 + i * 3}c4 6 4 12 0 18`} stroke="#a03516" strokeOpacity="0.4" strokeWidth="1.6" fill="none" />
      ))}
      <path d="M112 132c-10-4-22-2-30 4M113 134c-8 4-14 10-16 18" stroke="#e4572e" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* Water. */}
      <path d="M24 176c16-8 32-8 48 0s32 8 48 0 32-8 48 0" stroke="#bfe3e6" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
