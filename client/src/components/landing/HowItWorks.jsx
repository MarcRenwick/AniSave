import { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Coins, PackageCheck, ShoppingBasket, Sprout } from "lucide-react";
import { FadeIn } from "../motion";

gsap.registerPlugin(ScrollTrigger);

// The four steps, with where each sits on the vine (in the drawing's own
// 800 x 560 units) and where its card goes beside it (in % of the drawing).
const STEPS = [
  {
    icon: Sprout,
    title: "Farmer lists",
    text: "Farmers post their harvest with photos, a price and stock - with the recommended price for their town beside it.",
    at: [90, 470],
    card: { left: "15%", top: "77%" },
  },
  {
    icon: ShoppingBasket,
    title: "Buyer orders",
    text: "Buyers nearby browse, order and chat with the farm - and pre-order what is still growing.",
    at: [300, 170],
    card: { left: "22%", top: "-7%" },
  },
  {
    icon: PackageCheck,
    title: "Pick up at the farm",
    text: "The farmer accepts and gets it ready; every step arrives in the buyer's chat until it's picked up fresh.",
    at: [520, 400],
    card: { left: "51%", top: "79%" },
  },
  {
    icon: Coins,
    title: "Farmer earns",
    text: "Each completed sale lands on the farmer's dashboard - income, expenses and profit for every product.",
    at: [720, 110],
    card: { left: "54%", top: "-3%" },
  },
];
const VINE = "M90 470C150 360 200 200 300 170C400 140 430 380 520 400C610 420 650 160 720 110";
// The vine up to each step, to find how far along it each step is.
const UP_TO = [
  "M90 470",
  "M90 470C150 360 200 200 300 170",
  "M90 470C150 360 200 200 300 170C400 140 430 380 520 400",
  VINE,
];
// Where leaves sprout along the vine, as a share of its length.
const LEAF_AT = [0.06, 0.13, 0.21, 0.31, 0.4, 0.48, 0.57, 0.66, 0.75, 0.84, 0.92];

// "How AniSave works": on a wide screen the section holds still while the
// vine grows from one step to the next as you scroll, each step lighting up as
// the vine reaches it and leaves sprouting along the way. On a narrower
// screen it is a list with a stem that grows down beside it. Without
// animation (or JavaScript) every step is simply shown.
export default function HowItWorks() {
  const root = useRef(null);
  const pin = useRef(null);
  const vine = useRef(null);
  const counter = useRef(null);
  const reduced = useReducedMotion();
  const [leaves, setLeaves] = useState([]);

  // Leaves placed along the real path, turned to follow it.
  useLayoutEffect(() => {
    const path = vine.current;
    if (!path) return;
    const length = path.getTotalLength();
    setLeaves(
      LEAF_AT.map((share, i) => {
        const at = path.getPointAtLength(share * length);
        const ahead = path.getPointAtLength(Math.min(length, share * length + 2));
        const angle = (Math.atan2(ahead.y - at.y, ahead.x - at.x) * 180) / Math.PI;
        return { x: at.x, y: at.y, angle: angle + (i % 2 ? 60 : -60), share };
      })
    );
  }, []);

  useLayoutEffect(() => {
    if (reduced || leaves.length === 0) return undefined;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        const path = vine.current;
        const length = path.getTotalLength();
        // How far along the vine each step is.
        const measure = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.ownerSVGElement.appendChild(measure);
        const marks = UP_TO.map((d) => {
          measure.setAttribute("d", d);
          return d === "M90 470" ? 0 : measure.getTotalLength() / length;
        });
        measure.remove();

        const cards = gsap.utils.toArray("[data-step-card]");
        const nodes = gsap.utils.toArray("[data-step-node]");
        const icons = gsap.utils.toArray("[data-step-icon]");
        const leafEls = gsap.utils.toArray("[data-leaf]");
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        gsap.set(cards.slice(1), { autoAlpha: 0.28, y: 14 });
        gsap.set(nodes.slice(1), { scale: 0, transformOrigin: "50% 50%" });
        gsap.set(icons.slice(1), { color: "#b9ad95" });
        if (counter.current) counter.current.textContent = "01";
        gsap.set(leafEls, { scale: 0, transformOrigin: "0% 50%" });
        gsap.set("[data-step-bar]", { scaleX: 0, transformOrigin: "0% 50%" });

        const SPAN = 10;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            pin: pin.current,
            start: "top top",
            end: () => `+=${window.innerHeight * 2.4}`,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const reached = marks.filter((mark) => mark <= self.progress + 0.001).length;
              if (counter.current) counter.current.textContent = String(Math.max(1, reached)).padStart(2, "0");
            },
          },
        });
        tl.to(path, { strokeDashoffset: 0, duration: SPAN }, 0);
        tl.to("[data-step-bar]", { scaleX: 1, duration: SPAN }, 0);
        marks.forEach((mark, i) => {
          if (i === 0) return;
          tl.to(nodes[i], { scale: 1, duration: 0.6, ease: "back.out(2.2)" }, mark * SPAN - 0.3);
          tl.to(icons[i], { color: "#fffdf8", duration: 0.4 }, mark * SPAN - 0.2);
          tl.to(cards[i], { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, mark * SPAN - 0.3);
        });
        leafEls.forEach((leaf, i) => {
          tl.to(leaf, { scale: 1, duration: 0.5, ease: "back.out(2.4)" }, leaves[i].share * SPAN);
        });
      });

      mm.add("(max-width: 1023.98px)", () => {
        gsap.fromTo(
          "[data-stem]",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "50% 0%",
            scrollTrigger: { trigger: "[data-step-list]", start: "top 75%", end: "bottom 60%", scrub: true },
          }
        );
      });
    }, root);
    return () => ctx.revert();
  }, [reduced, leaves]);

  return (
    <section id="how-it-works" ref={root} className="harvest-grain relative bg-cream" data-testid="how-it-works" data-nav-tone="light">
      <div ref={pin} className="relative overflow-hidden lg:h-screen">
        {/* A warm glow behind the drawing. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-10%] top-1/2 h-[80vh] w-[70vw] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(242_193_78/0.18),transparent)]"
        />
        <div className="relative mx-auto grid h-full max-w-7xl items-center gap-12 px-6 py-24 sm:px-10 lg:grid-cols-12 lg:py-0">
          <div className="lg:col-span-4">
            <FadeIn>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-500">How AniSave works</p>
              <h2 className="mt-4 font-display text-[clamp(2.2rem,4.4vw,3.6rem)] font-semibold leading-[1.02] tracking-tight text-night">
                From field to table in four steps
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-gray-600">
                The whole journey lives in one place - from a farmer&apos;s first listing to the money they make from it.
              </p>
            </FadeIn>
            <div className="mt-10 hidden items-center gap-4 lg:flex" aria-hidden="true">
              <p className="font-display text-3xl font-semibold text-night">
                <span ref={counter}>04</span>
                <span className="text-gray-400"> / 04</span>
              </p>
              <span className="relative h-1 w-40 overflow-hidden rounded-full bg-sand">
                <span data-step-bar className="absolute inset-0 rounded-full bg-forest-600" />
              </span>
            </div>
          </div>

          <div className="lg:col-span-8">
            {/* The vine, on a wide screen. */}
            <div className="relative hidden aspect-[800/560] lg:block" data-testid="vine-stage">
              <svg viewBox="0 0 800 560" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id="vine-green" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor="#1f5130" />
                    <stop offset="0.6" stopColor="#2e7d32" />
                    <stop offset="1" stopColor="#58a061" />
                  </linearGradient>
                </defs>
                <path d={VINE} fill="none" stroke="#e7dfcf" strokeWidth="3" strokeDasharray="1 11" strokeLinecap="round" />
                <path ref={vine} data-vine d={VINE} fill="none" stroke="url(#vine-green)" strokeWidth="7" strokeLinecap="round" />
                {leaves.map(({ x, y, angle }, i) => (
                  <g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}>
                    <path
                      data-leaf
                      d="M0 0C6-7 16-8 26-3 18 5 8 6 0 0z"
                      fill={i % 3 === 0 ? "#58a061" : "#3b8a43"}
                    />
                  </g>
                ))}
                {STEPS.map(({ at: [x, y], icon: Icon, title }) => (
                  <g key={title}>
                    <circle cx={x} cy={y} r="30" fill="#fffdf8" stroke="#e7dfcf" strokeWidth="2" />
                    <g data-step-node>
                      <circle cx={x} cy={y} r="42" fill="#2e7d32" opacity="0.12" />
                      <circle cx={x} cy={y} r="30" fill="#2e7d32" />
                    </g>
                    <g data-step-icon style={{ color: "#fffdf8" }}>
                      <Icon x={x - 13} y={y - 13} width="26" height="26" strokeWidth={2} />
                    </g>
                  </g>
                ))}
              </svg>
              {STEPS.map(({ title, text, card }, i) => (
                <div
                  key={title}
                  data-step-card
                  className="harvest-card absolute w-[29%] p-4"
                  style={{ left: card.left, top: card.top }}
                >
                  <p className="font-display text-sm font-semibold text-clay-500">0{i + 1}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold leading-tight text-night">{title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">{text}</p>
                </div>
              ))}
            </div>

            {/* The same as a list, on a narrower screen. */}
            <ol className="relative space-y-6 lg:hidden" data-step-list>
              <span aria-hidden="true" className="absolute bottom-6 left-[27px] top-6 w-0.5 rounded-full bg-sand" />
              <span aria-hidden="true" data-stem className="absolute bottom-6 left-[27px] top-6 w-0.5 rounded-full bg-forest-600" />
              {STEPS.map(({ title, text, icon: Icon }, i) => (
                <FadeIn as="li" key={title} delay={0.05 * i} className="relative flex gap-5">
                  <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-forest-600 text-paper shadow-glow-forest">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="harvest-card flex-1 p-5">
                    <p className="font-display text-sm font-semibold text-clay-500">0{i + 1}</p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-night">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{text}</p>
                  </div>
                </FadeIn>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
