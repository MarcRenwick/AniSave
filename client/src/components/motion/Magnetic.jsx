import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import useMediaQuery from "../../hooks/useMediaQuery";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

// Leans whatever it wraps toward the cursor while the cursor is over it, and
// springs back when it leaves - for a call to action that wants to be
// pressed. Only with a mouse: on a touch screen it stays put.
export default function Magnetic({ children, strength = 0.3, className = "" }) {
  const ref = useRef(null);
  const fine = useMediaQuery(FINE_POINTER);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 240, damping: 16, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 240, damping: 16, mass: 0.5 });

  const follow = (event) => {
    if (!fine || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    x.set((event.clientX - (box.left + box.width / 2)) * strength);
    y.set((event.clientY - (box.top + box.height / 2)) * strength);
  };
  const release = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      ref={ref}
      style={{ x: springX, y: springY }}
      onPointerMove={follow}
      onPointerLeave={release}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.span>
  );
}
