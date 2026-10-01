import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import useMediaQuery from "../../hooks/useMediaQuery";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

// A card that tilts toward the cursor in 3D, with a soft light following it
// across the surface. Only with a mouse; anyone who has asked for less motion
// gets a still card (MotionConfig turns transforms off for them).
export default function TiltCard({ children, className = "", max = 9, as = "div", ...rest }) {
  const ref = useRef(null);
  const fine = useMediaQuery(FINE_POINTER);
  // Where the pointer is across the card, 0 to 1 each way; 0.5 is the middle.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 200, damping: 20, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  // The light, moved with a transform rather than repainting a gradient.
  const lightX = useSpring(useTransform(px, [0, 1], ["-40%", "40%"]), spring);
  const lightY = useSpring(useTransform(py, [0, 1], ["-40%", "40%"]), spring);
  const Tag = motion[as] || motion.div;

  const follow = (event) => {
    if (!fine || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width);
    py.set((event.clientY - box.top) / box.height);
  };
  const release = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <Tag
      ref={ref}
      onPointerMove={follow}
      onPointerLeave={release}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={`group/tilt relative will-change-transform ${className}`}
      {...rest}
    >
      {children}
      <motion.span
        aria-hidden="true"
        style={{ x: lightX, y: lightY }}
        className="pointer-events-none absolute inset-[-30%] rounded-full bg-[radial-gradient(closest-side,rgb(255_250_235/0.28),transparent)] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
      />
    </Tag>
  );
}
