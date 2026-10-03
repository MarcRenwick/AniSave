import { useLayoutEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ArrowUpRight, Check } from "lucide-react";
import SmoothLink from "../SmoothLink";
import { Magnetic, MouseParallax, ParallaxLayer, TextReveal } from "../motion";
import { EASE } from "../../theme/harvest";
import field960 from "../../assets/landing/hero-rice-field-sunrise-carabao-960.webp";
import field1600 from "../../assets/landing/hero-rice-field-sunrise-carabao-1600.webp";
import field2400 from "../../assets/landing/hero-rice-field-sunrise-carabao-2400.webp";

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

  // Scrolling away from the hero: the photo hangs back while the page goes,
  // and the words drift up and fade.
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
      {/* The field at sunrise. It hangs back as the page scrolls away, drifts
          a little with the mouse, and settles in from slightly closer as the
          page opens - only its transform and opacity move. */}
      <div data-depth="0.55" className="pointer-events-none absolute inset-0" aria-hidden="true">
        <ParallaxLayer depth={0.3} className="absolute -inset-[3%]">
          <motion.img
            src={field1600}
            srcSet={`${field960} 960w, ${field1600} 1600w, ${field2400} 2400w`}
            sizes="106vw"
            alt=""
            fetchPriority="high"
            decoding="async"
            data-testid="hero-photo"
            initial={reduced ? false : { opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.2, ease: EASE }}
            className="h-full w-full object-cover object-[72%_50%] md:object-[60%_50%]"
          />
        </ParallaxLayer>
      </div>
      {/* Shade so the words read against the bright sky: earthy and darkest
          behind the copy, opening up toward the carabao on the right; on a
          phone, where the words run across the whole photo, all over. */}
      <div
        aria-hidden="true"
        data-testid="hero-shade"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(15_36_24/0.76)_0%,rgb(15_36_24/0.74)_50%,rgb(31_26_18/0.8)_100%)] md:bg-[linear-gradient(100deg,rgb(12_28_19/0.88)_0%,rgb(15_36_24/0.8)_44%,rgb(31_26_18/0.5)_64%,rgb(31_26_18/0.14)_88%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-night/70 to-transparent"
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
          lines={["Fresh harvest,", { text: "direct from the farmers who grow it.", className: "text-gold-300", after: <BrushStroke /> }]}
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
