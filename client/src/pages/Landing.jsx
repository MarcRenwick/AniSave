import { useCallback, useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useHarvestTheme from "../theme/useHarvestTheme";
import { getPublicOverview } from "../services/api";
import useSmoothScroll from "../components/landing/useSmoothScroll";
import LandingNav from "../components/landing/LandingNav";
import Hero from "../components/landing/Hero";
import StatsStrip from "../components/landing/StatsStrip";
import HowItWorks from "../components/landing/HowItWorks";
import Categories from "../components/landing/Categories";
import Features from "../components/landing/Features";
import About from "../components/landing/About";
import Testimonials from "../components/landing/Testimonials";
import FinalCta from "../components/landing/FinalCta";
import LandingFooter from "../components/landing/LandingFooter";

// The public front page, in the "Premium Harvest" look (theme/harvest.css):
// a drawn sunrise over the fields, then how AniSave works, what it sells, why
// it's different, what buyers say, and a way in. The scroll-linked movement
// is GSAP's, the scrolling itself Lenis's, everything else Motion's - and all
// of it gives way to a calm page for anyone who has asked for less motion.
export default function Landing() {
  useHarvestTheme();
  const reduced = useReducedMotion();
  const lenis = useSmoothScroll(!reduced);
  // The counts and reviews: null while on their way, false if they can't be had.
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let live = true;
    getPublicOverview()
      .then(({ data }) => live && setOverview(data))
      .catch(() => live && setOverview(false));
    return () => {
      live = false;
    };
  }, []);

  // Anything that changes the page's height moves where the scroll animations
  // start and end: the counts arriving, the reviews, the fonts loading.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [overview]);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && ScrollTrigger.refresh());
    return () => {
      live = false;
    };
  }, []);

  // The bar's links and the scroll cue glide to their section.
  const jumpTo = useCallback(
    (id) => {
      const target = id === "home" ? 0 : document.getElementById(id);
      if (target === null) return;
      if (lenis) {
        lenis.scrollTo(target, { offset: id === "home" ? 0 : -8, duration: 1.4 });
      } else if (target === 0) {
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      } else {
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
    },
    [lenis, reduced]
  );

  return (
    <div className="overflow-x-clip bg-cream text-gray-900" data-testid="landing">
      <LandingNav onJump={jumpTo} />
      <main>
        <Hero onJump={jumpTo} />
        <StatsStrip overview={overview} />
        <HowItWorks />
        <Categories />
        <Features />
        <About />
        <Testimonials reviews={overview ? overview.reviews : null} />
        <FinalCta />
      </main>
      <LandingFooter onJump={jumpTo} />
    </div>
  );
}
