import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ArrowUpRight } from "lucide-react";
import SmoothLink from "../SmoothLink";
import { FadeIn, Magnetic, TextReveal } from "../motion";
import field960 from "../../assets/landing/cta-rice-field-dusk-960.webp";
import field1600 from "../../assets/landing/cta-rice-field-dusk-1600.webp";
import field2400 from "../../assets/landing/cta-rice-field-dusk-2400.webp";

// The closing call: one line for both sides of the market, over a rice
// field under the evening sky. The photo drifts slower than the page as it
// scrolls by.
export default function FinalCta() {
  const root = useRef(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (reduced) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-cta-photo]",
        { yPercent: -8 },
        { yPercent: 6, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } }
      );
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={root} className="harvest-grain-dark relative isolate overflow-hidden bg-night pb-64 pt-28 text-cream sm:pb-80 sm:pt-36" data-testid="final-cta" data-nav-tone="dark">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <img
          data-cta-photo
          data-testid="cta-photo"
          src={field1600}
          srcSet={`${field960} 960w, ${field1600} 1600w, ${field2400} 2400w`}
          sizes="100vw"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-x-0 -top-[10%] h-[120%] w-full object-cover object-[50%_62%] will-change-transform"
        />
        {/* Shade: deep at the top where the words are, lifting toward the
            field at the foot, with a little warmth of the low sun. */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_36_24/0.9)_0%,rgb(15_36_24/0.74)_45%,rgb(31_26_18/0.42)_78%,rgb(20_17_11/0.55)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_42%,rgb(15_36_24/0.45),transparent_75%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_70%,rgb(242_193_78/0.14),transparent_70%)]" />
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
