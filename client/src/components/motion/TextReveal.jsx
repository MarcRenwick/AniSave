import { motion } from "motion/react";
import { EASE } from "../../theme/harvest";

// A heading that rises into place word by word, each word coming up from
// behind a mask. `lines` is a list of strings or { text, className } - one
// line each - so a line can be styled on its own. Screen readers get the
// whole heading at once.
export default function TextReveal({
  as = "h1",
  lines,
  className,
  lineClassName = "",
  delay = 0,
  stagger = 0.07,
  duration = 0.95,
  on = "mount",
  ...rest
}) {
  const Tag = motion[as] || motion.h1;
  const rows = lines.map((line) => (typeof line === "string" ? { text: line } : line));
  const label = rows.map((row) => row.text).join(" ");

  return (
    <Tag
      className={className}
      aria-label={label}
      initial="hidden"
      {...(on === "mount" ? { animate: "shown" } : { whileInView: "shown", viewport: { once: true, amount: 0.4 } })}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...rest}
    >
      {rows.map((row, r) => {
        const words = row.text.split(" ");
        const wordSpans = words.map((word, w) => (
          <span key={w}>
            {/* The mask: tall enough for descenders, so a g or y isn't cut. */}
            <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
              <motion.span
                className="inline-block will-change-transform"
                variants={{
                  hidden: { y: "112%", rotate: 3 },
                  shown: { y: "0%", rotate: 0, transition: { duration, ease: EASE } },
                }}
              >
                {word}
              </motion.span>
            </span>
            {w < words.length - 1 ? " " : null}
          </span>
        ));
        return (
          <span key={r} aria-hidden="true" className={`block ${lineClassName} ${row.className || ""}`}>
            {/* `after` decorates the line itself - an underline as wide as its words. */}
            {row.after ? (
              <span className="relative inline-block">
                {wordSpans}
                {row.after}
              </span>
            ) : (
              wordSpans
            )}
          </span>
        );
      })}
    </Tag>
  );
}
