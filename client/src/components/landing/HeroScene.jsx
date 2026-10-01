// The landing page's hero, drawn in layers: a sky turning from night to
// sunrise, the sun, far mountains, terraced hills with a nipa hut, and rice
// stalks in front. Every layer is its own element so the hero can move them
// at different speeds (Hero.jsx). The hills are stretched to whatever shape
// the screen is (preserveAspectRatio="none"), with strokes that keep their
// width; anything that mustn't stretch - the sun, the hut - is placed over
// them in percentages instead.

const NONE = "none";
const KEEP = "non-scaling-stroke";

export function Sky() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#06120b_0%,#0b1d13_14%,#12301f_28%,#1d4a31_39%,#5d7438_48%,#c08a35_56%,#e8a33d_62%,#f2c14e_68%,#f7db8f_78%)]" />
      {/* The sunrise warming and cooling, slowly, behind everything. */}
      <div className="absolute inset-0 animate-sunrise bg-[radial-gradient(62%_46%_at_78%_50%,rgb(242_193_78/0.55),transparent_70%),radial-gradient(42%_30%_at_78%_56%,rgb(228_87_46/0.4),transparent_72%)] max-md:bg-[radial-gradient(90%_40%_at_70%_70%,rgb(242_193_78/0.45),transparent_70%)]" />
      {STARS.map(([left, top, size, delay]) => (
        <span
          key={`${left}-${top}`}
          className="absolute rounded-full bg-cream animate-pulse-soft"
          style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${delay}s`, opacity: 0.6 }}
        />
      ))}
    </div>
  );
}

// Fading as the sun comes up: only near the top of the sky.
const STARS = [
  [8, 14, 2, 0],
  [17, 24, 1.5, 1.2],
  [27, 13, 2, 0.6],
  [39, 19, 1.5, 1.8],
  [52, 12, 2, 0.3],
  [58, 23, 1.5, 1.1],
  [66, 14, 2, 2],
  [76, 18, 1.5, 0.9],
  [86, 12, 2, 1.5],
  [93, 22, 1.5, 0.4],
  [33, 28, 1.5, 2.2],
  [71, 29, 1.5, 1.6],
];

export function Sun() {
  return (
    <div aria-hidden="true" className="absolute right-[6%] top-[64%] aspect-square w-[clamp(96px,14vw,230px)] sm:right-[14%] md:top-[38%]">
      <div className="absolute -inset-[140%] rounded-full bg-[radial-gradient(closest-side,rgb(247_219_143/0.42),rgb(242_193_78/0.12)_55%,transparent)]" />
      <div className="absolute -inset-[45%] rounded-full bg-[radial-gradient(closest-side,rgb(255_244_207/0.7),rgb(242_193_78/0.25)_60%,transparent)] animate-pulse-soft" />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_38%,#fffaf0,#fde7a6_45%,#f2c14e_78%,#e8a33d)] shadow-[0_0_60px_rgb(242_193_78/0.55)]" />
    </div>
  );
}

export function FarHills() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio={NONE} className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="hero-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#2d5a3d" />
          <stop offset="0.75" stopColor="#183b29" />
        </linearGradient>
      </defs>
      <path
        d="M0 520C140 470 260 430 380 446C520 466 600 400 740 398C880 396 960 450 1080 444C1200 438 1300 380 1440 392C1520 398 1570 420 1600 430V900H0Z"
        fill="#3a6a45"
        opacity="0.45"
      />
      <path
        d="M0 560C90 520 170 470 260 488C350 506 420 440 520 436C620 432 690 500 790 492C890 484 960 420 1070 418C1180 416 1240 470 1330 466C1420 462 1500 430 1600 452V900H0Z"
        fill="url(#hero-far)"
      />
    </svg>
  );
}

export function MidHills() {
  const terraces = [0, 30, 62, 96, 132];
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio={NONE} className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="hero-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor="#2f6e3e" />
          <stop offset="0.9" stopColor="#1f5130" />
        </linearGradient>
      </defs>
      <path
        d="M0 640C160 600 320 586 480 610C640 634 760 660 920 628C1080 596 1220 572 1380 590C1480 600 1550 618 1600 612V900H0Z"
        fill="url(#hero-mid)"
      />
      <g fill="none" stroke="#b6d9b8" strokeOpacity="0.2" strokeWidth="1.2">
        {terraces.map((dy) => (
          <path
            key={dy}
            vectorEffect={KEEP}
            transform={`translate(0 ${dy + 26})`}
            d="M0 640C160 600 320 586 480 610C640 634 760 660 920 628C1080 596 1220 572 1380 590C1480 600 1550 618 1600 612"
          />
        ))}
      </g>
    </svg>
  );
}

export function NearHill() {
  const top = "M0 760C180 716 380 700 600 722C800 742 960 720 1120 700C1260 684 1420 690 1600 712";
  return (
    <>
      <svg viewBox="0 0 1600 900" preserveAspectRatio={NONE} className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="hero-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.76" stopColor="#3b8a43" />
            <stop offset="0.86" stopColor="#256a2b" />
            <stop offset="1" stopColor="#173d24" />
          </linearGradient>
        </defs>
        <path d={`${top}V900H0Z`} fill="url(#hero-near)" />
        {/* Sunrise catching the ridge. */}
        <path d={top} vectorEffect={KEEP} fill="none" stroke="#f7db8f" strokeOpacity="0.6" strokeWidth="2.4" />
        <g fill="none" stroke="#f7db8f" strokeOpacity="0.13" strokeWidth="1.2">
          {[22, 46, 72, 100, 130].map((dy) => (
            <path key={dy} vectorEffect={KEEP} transform={`translate(0 ${dy})`} d={top} />
          ))}
        </g>
      </svg>
      {/* A nipa hut on the ridge, kept in proportion whatever the screen. */}
      <svg
        viewBox="0 0 44 40"
        className="absolute bottom-[22.6%] left-[73.2%] w-[clamp(26px,2.8vw,48px)]"
        aria-hidden="true"
      >
        <path d="M5 40V22M39 40V22M15 40V25M29 40V25" stroke="#3b2a1f" strokeWidth="2.4" />
        <rect x="6" y="15" width="32" height="12" rx="1" fill="#8a5a3c" />
        <rect x="18" y="18" width="7" height="9" fill="#3b2a1f" />
        <path d="M0 17L22 1L44 17Z" fill="#c98521" />
        <path d="M3 15L22 2L41 15" stroke="#f7db8f" strokeWidth="1.2" fill="none" opacity="0.7" />
      </svg>
    </>
  );
}

// Rice in front, in four groups that lean in the wind out of step.
const STALKS = Array.from({ length: 66 }, (_, i) => {
  const x = (i / 65) * 1660 - 30 + ((i * 37) % 23) - 11;
  const height = 70 + ((i * 53) % 74);
  const lean = ((i * 31) % 38) - 19;
  return { x, height, lean, group: i % 4 };
});

// Long rice leaves between the stalks.
const BLADES = Array.from({ length: 90 }, (_, i) => {
  const x = (i / 89) * 1660 - 30 + ((i * 41) % 17) - 8;
  const height = 46 + ((i * 47) % 70);
  const lean = ((i * 23) % 44) - 22;
  return { x, height, lean, group: (i + 1) % 4 };
});

export function Foreground() {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio={NONE} className="absolute inset-0 h-full w-full" aria-hidden="true">
      <path d="M0 846C260 818 520 826 800 840C1080 854 1340 828 1600 836V900H0Z" fill="#0f2418" />
      {[0, 1, 2, 3].map((group) => (
        <g
          key={group}
          className="animate-wind"
          style={{
            transformBox: "fill-box",
            transformOrigin: "50% 100%",
            animationDuration: `${5.5 + group * 0.9}s`,
            animationDelay: `${group * -1.3}s`,
            "--wind": `${2.2 + group * 0.5}deg`,
          }}
        >
          {BLADES.filter((b) => b.group === group).map(({ x, height, lean }) => (
            <path
              key={`b${x}`}
              d={`M${x - 3} 900Q${x + lean * 0.5} ${900 - height * 0.55} ${x + lean} ${900 - height}Q${x + lean * 0.35} ${900 - height * 0.5} ${x + 4} 900Z`}
              fill={group % 2 ? "#173d24" : "#1f5130"}
            />
          ))}
          {STALKS.filter((s) => s.group === group).map(({ x, height, lean }) => {
            const tipX = x + lean;
            const tipY = 900 - height;
            const droop = lean >= 0 ? 1 : -1;
            return (
              <g key={x}>
                <path
                  d={`M${x} 900Q${x + lean * 0.2} ${900 - height * 0.55} ${tipX} ${tipY}`}
                  vectorEffect={KEEP}
                  fill="none"
                  stroke={group % 2 ? "#173d24" : "#1f5130"}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <path
                  d={`M${tipX} ${tipY}q${10 * droop} 3 ${17 * droop} 22`}
                  vectorEffect={KEEP}
                  fill="none"
                  stroke="#c98521"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeDasharray="1.6 3.4"
                  opacity="0.9"
                />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
