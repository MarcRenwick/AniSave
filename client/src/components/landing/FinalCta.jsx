import { ArrowUpRight } from "lucide-react";
import SmoothLink from "../SmoothLink";
import { FadeIn, Magnetic, TextReveal } from "../motion";
import { RiceSheaf, Leaf } from "./Produce";

// A field of wheat along the bottom of the closing section: three rows, the
// back ones paler and smaller, each leaning in the wind on its own beat.
function buildRow({ count, minH, maxH, seed }) {
  return Array.from({ length: count }, (_, i) => {
    const x = (i / (count - 1)) * 1640 - 20 + (((i + seed) * 37) % 19) - 9;
    const height = minH + (((i + seed) * 53) % (maxH - minH));
    const lean = (((i + seed) * 29) % 24) - 12;
    const tipX = x + lean;
    const tipY = 320 - height;
    // The ear: grains down both sides of the top of the stalk.
    const angle = Math.atan2(320 - tipY, x - tipX);
    const along = { x: Math.cos(angle), y: Math.sin(angle) };
    const grains = Array.from({ length: 6 }, (_, k) => {
      const t = 6 + k * 8;
      const side = k % 2 ? 1 : -1;
      return {
        cx: tipX + along.x * t + -along.y * side * 3.6,
        cy: tipY + along.y * t + along.x * side * 3.6,
        rotate: (angle * 180) / Math.PI - 90 + side * 24,
      };
    });
    return { x, tipX, tipY, grains };
  });
}
const ROWS = [
  { stalks: buildRow({ count: 26, minH: 120, maxH: 170, seed: 3 }), stem: "#8f5e10", grain: "#c98521", opacity: 0.35, wind: "2deg", duration: "7.5s" },
  { stalks: buildRow({ count: 30, minH: 160, maxH: 220, seed: 7 }), stem: "#9c6514", grain: "#e8a33d", opacity: 0.6, wind: "2.6deg", duration: "6.4s" },
  { stalks: buildRow({ count: 34, minH: 190, maxH: 270, seed: 11 }), stem: "#b8761a", grain: "#f2c14e", opacity: 1, wind: "3.2deg", duration: "5.4s" },
];

function WheatField() {
  return (
    <svg viewBox="0 0 1600 320" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[clamp(150px,30%,280px)] w-full" aria-hidden="true">
      {ROWS.map(({ stalks, stem, grain, opacity, wind, duration }, r) => (
        <g
          key={r}
          className="animate-wind"
          opacity={opacity}
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%", "--wind": wind, animationDuration: duration, animationDelay: `${r * -1.7}s` }}
        >
          {stalks.map(({ x, tipX, tipY, grains }) => (
            <g key={x}>
              <path d={`M${x} 320Q${x + (tipX - x) * 0.2} ${(320 + tipY) / 2} ${tipX} ${tipY}`} stroke={stem} strokeWidth="2.2" fill="none" />
              {grains.map(({ cx, cy, rotate }, k) => (
                <ellipse key={k} cx={cx} cy={cy} rx="3.2" ry="6.6" fill={grain} transform={`rotate(${rotate} ${cx} ${cy})`} />
              ))}
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

// The closing call: one line for both sides of the market, over a field of
// wheat under a low sun.
export default function FinalCta() {
  return (
    <section className="harvest-grain-dark relative isolate overflow-hidden bg-night pb-64 pt-28 text-cream sm:pb-80 sm:pt-36" data-testid="final-cta" data-nav-tone="dark">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[58%] -z-10 h-[46rem] w-[min(110vw,70rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(242_193_78/0.38),rgb(228_87_46/0.14)_55%,transparent)]"
      />
      <WheatField />
      <div aria-hidden="true" className="pointer-events-none absolute left-[8%] top-[18%] w-14 animate-float opacity-80 max-sm:hidden" style={{ "--float-from": "-12deg", "--float-to": "8deg" }}>
        <Leaf className="h-auto w-full" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute right-[10%] top-[26%] w-12 animate-float opacity-70 max-sm:hidden" style={{ animationDelay: "-3s" }}>
        <RiceSheaf className="h-auto w-full" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <FadeIn>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Join AniSave</p>
        </FadeIn>
        <TextReveal
          as="h2"
          on="view"
          className="mt-5 font-display text-[clamp(2.6rem,6.4vw,5.6rem)] font-semibold leading-[0.98] tracking-[-0.02em]"
          lines={["From your field", { text: "to their table.", className: "text-gold-300" }]}
        />
        <FadeIn delay={0.3}>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
            Farmers: list your harvest and sell to buyers nearby. Buyers: order fresh from the farm and pick it up.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Magnetic>
              <SmoothLink
                to="/register"
                className="group inline-flex items-center gap-2 rounded-full bg-tomato-600 px-8 py-4 text-base font-semibold text-white shadow-glow-tomato transition-[background-color,box-shadow] duration-300 hover:bg-tomato-700 hover:shadow-[0_20px_50px_-10px_rgb(228_87_46/0.85)]"
              >
                Sell your harvest
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </SmoothLink>
            </Magnetic>
            <SmoothLink
              to="/buyer/home"
              className="inline-flex items-center gap-2 rounded-full border border-gold-300/50 bg-night/40 px-7 py-4 text-base font-semibold text-gold-200 backdrop-blur-sm transition-colors duration-300 hover:border-gold-300 hover:text-gold-100"
            >
              Start buying
            </SmoothLink>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
