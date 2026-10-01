import { motion } from "motion/react";
import { EASE } from "../../theme/harvest";

// A group whose items arrive one after another rather than all at once: when
// the group scrolls into view, or as soon as it mounts (`on="mount"`).
// Every direct item is a <StaggerItem>.
export function Stagger({
  as = "div",
  on = "view",
  stagger = 0.08,
  delay = 0,
  amount = 0.15,
  className,
  children,
  ...rest
}) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial="hidden"
      {...(on === "mount" ? { animate: "shown" } : { whileInView: "shown", viewport: { once: true, amount } })}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ as = "div", y = 22, x = 0, scale = 1, duration = 0.6, className, children, ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, y, x, scale },
        shown: { opacity: 1, y: 0, x: 0, scale: 1, transition: { duration, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
