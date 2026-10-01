import { useLayoutEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ArrowUpRight, Check } from "lucide-react";
import SmoothLink from "../SmoothLink";
import { Magnetic, MouseParallax, ParallaxLayer, TextReveal } from "../motion";
import { EASE } from "../../theme/harvest";
import { FarHills, Foreground, MidHills, NearHill, Sky, Sun } from "./HeroScene";
import { Calamansi, Chili, Leaf, Mango, RiceSheaf, Tomato } from "./Produce";

// Produce drifting through the scene: where, how big, how near (nearer is
// sharper, bigger and moves more), and whether a phone shows it too.
const PRODUCE = [
  { Art: Leaf, className: "left-[46%] top-[17%] w-[clamp(40px,4.6vw,76px)] max-md:left-auto max-md:right-[7%] max-md:top-[15%]", depth: 0.8, delay: 0, spin: ["-14deg", "8deg"] },
  { Art: RiceSheaf, className: "right-[30%] top-[12%] w-[clamp(40px,4vw,64px)] blur-[1px] opacity-80", depth: 0.45, delay: -2, spin: ["10deg", "-6deg"], wide: true },
  { Art: Mango, className: "right-[6%] top-[22%] w-[clamp(52px,5.4vw,92px)]", depth: 0.95, delay: -4, spin: ["-8deg", "10deg"], wide: true },
  { Art: Tomato, className: "right-[23%] top-[55%] w-[clamp(40px,4vw,66px)]", depth: 0.75, delay: -1, spin: ["6deg", "-10deg"], wide: true },
  { Art: Chili, className: "left-[58%] top-[42%] w-[clamp(30px,2.8vw,46px)] blur-[1.5px] opacity-70", depth: 0.3, delay: -3, spin: ["-20deg", "-4deg"], wide: true },
  { Art: Calamansi, className: "left-[86%] top-[64%] w-[clamp(34px,3.2vw,54px)] blur-[0.5px]", depth: 0.6, delay: -5, spin: ["0deg", "14deg"], wide: true },
];

// Each layer's share of the scroll-away: 0 sticks to the page, 1 stays put.
const LAYERS = [
  { key: "sun", depth: 0.85, mouse: 0.12, Layer: Sun, wide: false },
  { key: "far", depth: 0.7, mouse: 0.22, Layer: FarHills, wide: true },
  { key: "mid", depth: 0.5, mouse: 0.4, Layer: MidHills, wide: true },
  { key: "near", depth: 0.3, mouse: 0.62, Layer: NearHill, wide: true },
];

const appear = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: EASE },
});

// The brush stroke under "straight to you.", painted once the words are up.
function BrushStroke() {
  return (
    <svg
      viewBox="0 0 400 24"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -bottom-[0.06em] left-0 h-[0.16em] w-full"
      aria-hidden="true"
    >
      <motion.path
        d="M4 16C80 6 170 4 250 8c50 3 98 7 142 4"
        fill="none"
        stroke="#e4572e"
        strokeWidth="7"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 1.25, ease: EASE }}
      />
    </svg>
  );
}

export default function Hero({ onJump }) {
  const root = useRef(null);
  const reduced = useReducedMotion();

  // Scrolling away from the hero: the far layers hang back while the near
  // ones go with the page, and the words drift up and fade.
  useLayoutEffect(() => {
    if (reduced) return undefined;
    const ctx = gsap.context(() => {
      const away = (end = "bottom top") => ({
        trigger: root.current,
        start: "top top",
        end,
        scrub: true,
        invalidateOnRefresh: true,
      });
      gsap.utils.toArray("[data-depth]").forEach((layer) => {
        const depth = Number(layer.dataset.depth);
        gsap.to(layer, { y: () => depth * window.innerHeight * 0.45, ease: "none", scrollTrigger: away() });
      });
      gsap.to("[data-hero-copy]", {
        y: () => window.innerHeight * 0.16,
        opacity: 0,
        ease: "none",
        scrollTrigger: away("65% top"),
      });
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <MouseParallax
      as="section"
      ref={root}
      id="home"
      className="harvest-grain-dark relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-night text-cream"
      data-testid="hero"
      data-nav-tone="dark"
    >
      <Sky />
      {LAYERS.map(({ key, depth, mouse, Layer, wide }) => (
        <div
          key={key}
          data-depth={depth}
          className={`pointer-events-none absolute inset-y-0 ${wide ? "-inset-x-[4%]" : "inset-x-0"}`}
        >
          <ParallaxLayer depth={mouse} className="absolute inset-0">
            <Layer />
          </ParallaxLayer>
        </div>
      ))}
      {PRODUCE.map(({ Art, className, depth, delay, spin, wide }) => (
        <div
          key={className}
          data-depth={1 - depth}
          className={`pointer-events-none absolute ${className} ${wide ? "max-md:hidden" : ""}`}
        >
          <ParallaxLayer depth={depth} range={60}>
            <div
              className="animate-float drop-shadow-[0_12px_18px_rgb(6_18_11/0.45)]"
              style={{ animationDelay: `${delay}s`, "--float-from": spin[0], "--float-to": spin[1] }}
            >
              <Art className="h-auto w-full" />
            </div>
          </ParallaxLayer>
        </div>
      ))}
      <div data-depth="0" className="pointer-events-none absolute -inset-x-[4%] inset-y-0">
        <ParallaxLayer depth={0.9} className="absolute inset-0">
          <Foreground />
        </ParallaxLayer>
      </div>
      {/* Shade behind the words, so they read against any part of the sky. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgb(6_18_11/0.62)_0%,rgb(6_18_11/0.28)_42%,transparent_68%)]"
      />

      <div
        data-hero-copy
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pb-44 pt-32 sm:px-10 lg:pb-52"
      >
        <motion.p
          {...appear(0.1)}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-cream/15 bg-cream/[0.06] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse-soft" />
          Farm-to-buyer marketplace
        </motion.p>

        <TextReveal
          as="h1"
          delay={0.25}
          className="mt-6 max-w-[14ch] font-display text-[clamp(2.9rem,7.2vw,7rem)] font-semibold leading-[0.96] tracking-[-0.025em] text-cream"
          lines={["Fresh from the farm,", { text: "straight to you.", className: "text-gold-300", after: <BrushStroke /> }]}
        />

        <motion.p {...appear(0.95)} className="mt-7 max-w-xl text-base leading-relaxed text-cream/80 sm:text-lg">
          AniSave connects local farmers directly with buyers nearby - no middlemen, fair prices, and produce reserved
          fresh for pickup.
        </motion.p>

        <motion.div {...appear(1.1)} className="mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
          <Magnetic>
            <SmoothLink
              to="/register"
              className="group relative inline-flex items-center gap-2 rounded-full bg-tomato-600 px-7 py-3.5 text-[15px] font-semibold text-white shadow-glow-tomato transition-[background-color,box-shadow] duration-300 hover:bg-tomato-700 hover:shadow-[0_20px_50px_-10px_rgb(228_87_46/0.85)]"
              data-testid="hero-get-started"
            >
              Get started
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </SmoothLink>
          </Magnetic>
          <SmoothLink
            to="/buyer/home"
            className="inline-flex items-center gap-2 rounded-full border border-cream/25 bg-cream/[0.06] px-6 py-3.5 text-[15px] font-semibold text-cream backdrop-blur-sm transition-colors duration-300 hover:border-cream/50 hover:bg-cream/[0.12]"
          >
            Browse the market
          </SmoothLink>
        </motion.div>

        <motion.ul {...appear(1.25)} className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-cream/80">
          {["Verified farmers", "Fair local prices", "Pick up at the farm"].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-400/20 text-gold-300">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </motion.ul>
      </div>

      <motion.button
        type="button"
        onClick={() => onJump("how-it-works")}
        {...appear(1.6)}
        className="group absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cream/70 transition-colors hover:text-cream sm:flex"
        aria-label="Scroll to how AniSave works"
      >
        Scroll
        <span className="relative flex h-10 w-6 justify-center rounded-full border border-cream/35">
          <span className="mt-2 h-2 w-1 rounded-full bg-gold-300 motion-safe:animate-[harvest-scroll-cue_1.8s_var(--ease-harvest)_infinite]" />
        </span>
      </motion.button>
    </MouseParallax>
  );
}
