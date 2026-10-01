import { motion } from "motion/react";
import { EASE } from "../../theme/harvest";

// Fades and rises into place - the first time it scrolls into view, or as soon
// as it mounts (`on="mount"`), for what is on screen from the start.
export default function FadeIn({
  as = "div",
  on = "view",
  delay = 0,
  y = 24,
  x = 0,
  duration = 0.7,
  amount = 0.25,
  className,
  children,
  ...rest
}) {
  const Tag = motion[as] || motion.div;
  const shown = { opacity: 1, y: 0, x: 0, transition: { duration, delay, ease: EASE } };
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, x }}
      {...(on === "mount" ? { animate: shown } : { whileInView: shown, viewport: { once: true, amount } })}
      {...rest}
    >
      {children}
    </Tag>
  );
}
