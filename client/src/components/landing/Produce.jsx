import { useId } from "react";

// Small drawings of produce that drift over the landing page's hero and its
// call to action. Each takes the size it is given.

export function Leaf({ className = "" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#256a2b" />
          <stop offset="0.6" stopColor="#3b8a43" />
          <stop offset="1" stopColor="#88bf8d" />
        </linearGradient>
      </defs>
      <path d="M8 56C8 30 26 10 58 6c-2 32-22 50-50 50z" fill={`url(#${id})`} />
      <path d="M10 54C24 40 36 28 52 12" stroke="#eef6ee" strokeOpacity="0.7" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path
        d="M20 44c-1-4-1-8 0-12M28 36c-1-4 0-8 1-12M36 28c0-3 1-6 3-9M24 40c4 0 8 1 11 2M32 32c4 0 8 0 11 1"
        stroke="#eef6ee"
        strokeOpacity="0.4"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RiceSheaf({ className = "" }) {
  const grains = [
    [44, 11, 38],
    [40, 17, 40],
    [36, 23, 42],
    [32, 29, 44],
    [28, 35, 46],
    [49, 16, 30],
    [45, 22, 32],
    [41, 28, 34],
    [37, 34, 36],
  ];
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M12 60C20 44 30 26 48 6" stroke="#c98521" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M18 50c8-4 14-4 20-2" stroke="#8f5e10" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
      {grains.map(([x, y, r]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="2.8" ry="5.4" fill="#f2c14e" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      {grains.slice(0, 5).map(([x, y, r]) => (
        <ellipse
          key={`h${x}-${y}`}
          cx={x - 0.8}
          cy={y - 1.6}
          rx="1"
          ry="2.2"
          fill="#fff6d6"
          opacity="0.7"
          transform={`rotate(${r} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}

export function Mango({ className = "" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffe9a3" />
          <stop offset="0.5" stopColor="#f2b544" />
          <stop offset="1" stopColor="#e4572e" />
        </radialGradient>
      </defs>
      <g transform="rotate(-22 32 34)">
        <path d="M32 9c15 0 25 12 25 27 0 13-9 22-23 22C19 58 8 47 8 34 8 19 18 9 32 9z" fill={`url(#${id})`} />
        <ellipse cx="23" cy="22" rx="6.5" ry="3.6" fill="#fff" opacity="0.35" transform="rotate(-30 23 22)" />
      </g>
      <path d="M30 10c1-6 7-10 15-9-2 7-8 10-15 9z" fill="#2e7d32" />
      <path d="M30 10c3-3 7-5 13-7" stroke="#88bf8d" strokeWidth="1.2" fill="none" opacity="0.8" />
    </svg>
  );
}

export function Tomato({ className = "" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ff9a76" />
          <stop offset="0.55" stopColor="#e4572e" />
          <stop offset="1" stopColor="#a03516" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="37" rx="24" ry="21" fill={`url(#${id})`} />
      <path d="M32 37c-6-1-10 2-12 7M32 37c6-1 10 2 12 7" stroke="#a03516" strokeOpacity="0.35" strokeWidth="2" fill="none" />
      <ellipse cx="22" cy="28" rx="6" ry="3.2" fill="#fff" opacity="0.4" transform="rotate(-32 22 28)" />
      <path d="M32 17c-3 4-9 5-14 4 4 4 9 6 14 4 5 2 10 0 14-4-5 1-11 0-14-4z" fill="#2e7d32" />
      <path d="M32 18V9" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Chili({ className = "" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7a59" />
          <stop offset="1" stopColor="#b3261e" />
        </linearGradient>
      </defs>
      <path d="M17 15c11 2 17 11 19 23 2 9 8 15 17 17-13 5-26-2-32-14-4-9-6-18-4-26z" fill={`url(#${id})`} />
      <path d="M21 20c5 3 8 8 9 14" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M17 15c-1-5 2-9 7-10" stroke="#2e7d32" strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Calamansi({ className = "" }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="0.38" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#d9f2a0" />
          <stop offset="0.55" stopColor="#7cbf3f" />
          <stop offset="1" stopColor="#3b8a43" />
        </radialGradient>
      </defs>
      <circle cx="30" cy="36" r="20" fill={`url(#${id})`} />
      <circle cx="44" cy="22" r="11" fill="#f2c14e" />
      <circle cx="41" cy="19" r="3" fill="#fff6d6" opacity="0.7" />
      <ellipse cx="22" cy="28" rx="5" ry="2.8" fill="#fff" opacity="0.4" transform="rotate(-30 22 28)" />
    </svg>
  );
}
