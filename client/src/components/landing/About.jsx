import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { HandCoins, Leaf, Sprout, Users } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "../motion";
import terraces from "../../assets/landing-terraces-960.webp";
import terracesSmall from "../../assets/landing-terraces-560.webp";

const VALUES = [
  { icon: HandCoins, title: "Farmers keep more", text: "No middlemen between the field and the buyer, so more of every sale stays with the farm." },
  { icon: Leaf, title: "Fresher food", text: "Produce goes straight from the farm to the buyer, without passing through a chain of traders first." },
  { icon: Users, title: "Neighbours, not strangers", text: "Buyers find farms near them, talk to them and pick up in person." },
];

// "About AniSave": what it is for, beside the rice terraces - the photo drifts
// slower than the page as it scrolls by, with a turning badge on its corner.
export default function About() {
  const root = useRef(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (reduced) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-about-photo]",
        { yPercent: -10, scale: 1.14 },
        {
          yPercent: 4,
          scale: 1.04,
          ease: "none",
          scrollTrigger: { trigger: "[data-about-frame]", start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section id="about" ref={root} className="harvest-grain relative overflow-hidden bg-cream py-24 sm:py-32" data-testid="about" data-nav-tone="light">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20">
        <div>
          <FadeIn>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-500">About AniSave</p>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,4.6vw,3.8rem)] font-semibold leading-[1.02] tracking-tight text-night">
              Fair for farmers. Fresh for everyone.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
              AniSave is a farm-to-buyer marketplace that lets local farmers list and sell their produce directly to
              nearby buyers. By cutting out the middlemen, farmers earn more from every sale and buyers get produce
              that&apos;s fresher and more affordable.
            </p>
          </FadeIn>
          <Stagger as="ul" className="mt-10 space-y-6" stagger={0.1}>
            {VALUES.map(({ icon: Icon, title, text }) => (
              <StaggerItem as="li" key={title} x={-16} y={0} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-night">{title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <FadeIn className="relative" y={40}>
          <div data-about-frame className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift">
            <img
              data-about-photo
              src={terraces}
              srcSet={`${terracesSmall} 560w, ${terraces} 960w`}
              sizes="(min-width: 1024px) 40vw, 90vw"
              alt="Rice terraces with a small farm hut, in the morning light"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover will-change-transform"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night/40 via-transparent to-transparent" />
          </div>
          {/* The turning badge. */}
          <div className="absolute -bottom-8 -left-4 h-32 w-32 sm:-left-8 sm:h-36 sm:w-36" aria-hidden="true">
            <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full animate-spin-slow">
              <defs>
                <path id="about-ring" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0" />
              </defs>
              <circle cx="60" cy="60" r="58" fill="#f2c14e" />
              <text fill="#0f2418" fontSize="11.5" fontWeight="700" letterSpacing="3.2" fontFamily="var(--font-body)">
                <textPath href="#about-ring">FRESH · FAIR · LOCAL · NO MIDDLEMEN ·</textPath>
              </text>
            </svg>
            <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-night text-gold-300">
              <Sprout className="h-6 w-6" />
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
