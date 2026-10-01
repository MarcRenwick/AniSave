import { useEffect, useState } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

// Smooth, weighted scrolling for the landing page (Lenis), driven by GSAP's
// clock so the scroll-linked animations (ScrollTrigger) move in the same
// frame as the page. Off for anyone who has asked for less motion, and gone
// as soon as the landing page is left - the farmer pages scroll natively.
export default function useSmoothScroll(enabled) {
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const instance = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
    });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      instance.destroy();
      setLenis(null);
    };
  }, [enabled]);

  return lenis;
}
