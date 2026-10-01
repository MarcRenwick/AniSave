import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { EASE } from "../../theme/harvest";

const plain = (n) => Math.round(n).toLocaleString();

// A number that counts up to its value - when it scrolls into view, or as soon
// as it mounts (`on="mount"`) - and from where it was to its new value when
// the value changes. It writes straight into its own text (React never holds
// a text node in it) rather than re-rendering every frame, and anyone who has
// asked for less motion just gets the number.
export default function CountUp({ value, format = plain, duration = 1.3, delay = 0, on = "view", className, ...rest }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  // What the text shows right now, so a new value counts on from there.
  const shown = useRef(0);
  const started = on === "mount" || inView;
  const formatRef = useRef(format);
  formatRef.current = format;

  // Something to read before the first frame is painted.
  useLayoutEffect(() => {
    if (ref.current && !ref.current.textContent) ref.current.textContent = formatRef.current(0);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const write = (n) => {
      el.textContent = formatRef.current(n);
    };
    const target = Number(value);
    if (!Number.isFinite(target)) {
      el.textContent = value ?? "";
      return undefined;
    }
    if (!started) {
      write(shown.current);
      return undefined;
    }
    if (reduced || shown.current === target) {
      shown.current = target;
      write(target);
      return undefined;
    }
    const controls = animate(shown.current, target, {
      duration,
      delay,
      ease: EASE,
      onUpdate: (v) => {
        shown.current = v;
        write(v);
      },
      onComplete: () => {
        shown.current = target;
        write(target);
      },
    });
    return () => controls.stop();
  }, [value, started, reduced, duration, delay]);

  return <span ref={ref} className={className} {...rest} />;
}
