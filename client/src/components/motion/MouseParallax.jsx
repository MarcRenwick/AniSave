import { createContext, useContext, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import useMediaQuery from "../../hooks/useMediaQuery";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const Pointer = createContext(null);

// A region that follows the mouse: every <ParallaxLayer> inside it drifts with
// the pointer, further the nearer its `depth` (0 far away, 1 right in front).
// Touch screens get nothing to follow, so the layers stay still.
export function MouseParallax({ as = "div", className = "", children, ref: outerRef, ...rest }) {
  const fine = useMediaQuery(FINE_POINTER);
  // -1 at the left/top edge, 1 at the right/bottom.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { stiffness: 60, damping: 18, mass: 0.8 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const ref = useRef(null);
  // Its own ref, and the caller's too if it passed one.
  const setRef = (node) => {
    ref.current = node;
    if (typeof outerRef === "function") outerRef(node);
    else if (outerRef) outerRef.current = node;
  };
  const Tag = motion[as] || motion.div;

  const follow = (event) => {
    if (!fine || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    x.set(((event.clientX - box.left) / box.width) * 2 - 1);
    y.set(((event.clientY - box.top) / box.height) * 2 - 1);
  };
  const release = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Pointer.Provider value={{ x: sx, y: sy }}>
      <Tag ref={setRef} onPointerMove={follow} onPointerLeave={release} className={className} {...rest}>
        {children}
      </Tag>
    </Pointer.Provider>
  );
}

// One layer of a <MouseParallax> scene. `range` is how far (in px) the
// nearest layer moves at the edge of the region.
export function ParallaxLayer({ depth = 0.5, range = 36, className = "", style, children, ...rest }) {
  const pointer = useContext(Pointer);
  const fallback = useMotionValue(0);
  const x = useTransform(pointer?.x ?? fallback, (v) => v * depth * range);
  const y = useTransform(pointer?.y ?? fallback, (v) => v * depth * range * 0.55);
  return (
    <motion.div style={{ x, y, ...style }} className={className} {...rest}>
      {children}
    </motion.div>
  );
}
