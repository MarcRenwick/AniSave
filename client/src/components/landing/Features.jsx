import { useLayoutEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { BadgeCheck, CalendarClock, MessagesSquare, Scale, TrendingUp, Zap } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "../motion";

// What AniSave actually does - each of these is a real feature of the app.
const FEATURES = [
  {
    icon: BadgeCheck,
    title: "Verified farmers",
    text: "An admin checks every farm before it can sell, so buyers always know who they are buying from.",
  },
  {
    icon: Scale,
    title: "Fair local prices",
    text: "A recommended price for each product in each town helps farmers price right and buyers pay fair.",
  },
  {
    icon: Zap,
    title: "Flash sales",
    text: "Produce that needs to move can go on sale for a day, so less of the harvest goes to waste.",
  },
  {
    icon: MessagesSquare,
    title: "Chat and live order updates",
    text: "Buyers and farms talk in the app, and every step of an order arrives in the chat as it happens.",
  },
  {
    icon: CalendarClock,
    title: "Pre-orders",
    text: "Reserve what is still growing; the farmer accepts once the harvest is in.",
  },
  {
    icon: TrendingUp,
    title: "Profit at a glance",
    text: "Farmers see the income, expenses and profit of every product on their own dashboard.",
  },
];

// Each card's icon gives a little bounce when the card is hovered.
const iconMotion = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: -10, scale: 1.12, transition: { type: "spring", stiffness: 420, damping: 12 } },
};

export default function Features() {
  const root = useRef(null);
  const reduced = useReducedMotion();

  // The giant word behind the section drifts sideways as it scrolls past.
  useLayoutEffect(() => {
    if (reduced) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-drift]",
        { xPercent: 6 },
        {
          xPercent: -14,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={root} className="harvest-grain-dark relative isolate overflow-hidden bg-night py-24 text-cream sm:py-32" data-testid="features" data-nav-tone="dark">
      <p
        data-drift
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 left-0 -z-10 whitespace-nowrap font-display text-[clamp(7rem,20vw,18rem)] font-semibold leading-none tracking-tight text-cream/[0.035]"
      >
        harvest · market · harvest
      </p>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-[-10%] -z-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(46_125_50/0.35),transparent)]"
      />

      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <FadeIn className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Why AniSave</p>
          <h2 className="mt-4 font-display text-[clamp(2.2rem,4.6vw,3.8rem)] font-semibold leading-[1.02] tracking-tight">
            Built for the way farms really sell
          </h2>
        </FadeIn>

        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <StaggerItem key={title} y={32}>
              <motion.article
                initial="rest"
                whileHover="hover"
                animate="rest"
                className="group relative h-full overflow-hidden rounded-3xl border border-cream/10 bg-[linear-gradient(160deg,rgb(255_253_248/0.08),rgb(255_253_248/0.02))] p-7 transition-colors duration-300 hover:border-gold-400/40"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold-400/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="flex items-center justify-between">
                  <motion.span
                    variants={iconMotion}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400 text-night shadow-glow-gold"
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.2} />
                  </motion.span>
                  <span className="font-display text-sm font-semibold text-cream/40">0{i + 1}</span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/75">{text}</p>
              </motion.article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
