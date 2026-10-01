import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { EASE } from "../../theme/harvest";

// Shared pieces of the buyer pages' look: a photo header that drifts slower
// than the page, an empty state with a photograph instead of an icon, and
// shimmering placeholders shaped like what is loading.

// A short photo band at the top of a page, its title on an earthy shade.
// The photo moves at half the page's speed as it scrolls away.
export function PhotoHeader({ photo, eyebrow, title, children, className = "h-40 sm:h-48", position = "object-center" }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  return (
    <div ref={ref} className={`relative isolate overflow-hidden rounded-[1.75rem] bg-night text-cream shadow-lift ${className}`} data-testid="photo-header">
      <motion.img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="(min-width: 1280px) 1200px, 100vw"
        alt=""
        decoding="async"
        style={reduced ? undefined : { y }}
        initial={reduced ? false : { scale: 1.12, opacity: 0 }}
        animate={{ scale: 1.04, opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
        className={`absolute inset-0 -z-10 h-[125%] w-full object-cover ${position}`}
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(15_36_24/0.86)_0%,rgb(15_36_24/0.62)_45%,rgb(31_26_18/0.25)_100%)]" />
      <div className="flex h-full flex-col justify-end p-5 sm:p-7">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-cream sm:text-4xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}

// "Nothing here yet", with a photo from the market rather than an icon.
export function PhotoEmptyState({ photo, title, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mx-auto flex max-w-md flex-col items-center px-4 py-10 text-center"
      data-testid="empty-state"
    >
      <div className="relative h-36 w-48 overflow-hidden rounded-[1.5rem] shadow-lift ring-4 ring-paper sm:h-40 sm:w-56">
        <img src={photo.src} srcSet={photo.srcSet} sizes="14rem" alt={photo.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/25 to-transparent" />
      </div>
      <h3 className="mt-6 font-display text-xl font-semibold text-gray-900">{title}</h3>
      {children && <p className="mt-2 text-sm leading-relaxed text-gray-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

// The harvest look's warm light sweeping across a placeholder (theme/harvest.css).
const shimmer = "harvest-shimmer";

// Placeholder cards the shape of the marketplace's, while listings load.
export function CardSkeletons({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4" role="status" aria-live="polite" data-testid="card-skeletons">
      <span className="sr-only">Loading...</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="rounded-[1.4rem] bg-paper p-3 ring-1 ring-gray-200">
          <div className={`h-44 rounded-2xl ${shimmer}`} />
          <div className={`mt-4 h-4 w-3/4 rounded-full ${shimmer}`} />
          <div className={`mt-3 h-5 w-1/2 rounded-full ${shimmer}`} />
          <div className={`mt-3 h-3 w-2/3 rounded-full ${shimmer}`} />
        </div>
      ))}
    </div>
  );
}

// Placeholder rows (orders, a cart), and a placeholder block (a page's panel).
export function RowSkeletons({ count = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" data-testid="row-skeletons">
      <span className="sr-only">Loading...</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex items-center gap-4 rounded-2xl bg-paper p-4 ring-1 ring-gray-200">
          <div className={`h-16 w-16 shrink-0 rounded-xl ${shimmer}`} />
          <div className="flex-1 space-y-2.5">
            <div className={`h-4 w-1/2 rounded-full ${shimmer}`} />
            <div className={`h-3 w-1/3 rounded-full ${shimmer}`} />
          </div>
          <div className={`h-8 w-20 rounded-full ${shimmer}`} />
        </div>
      ))}
    </div>
  );
}

export function BlockSkeleton({ className = "h-64" }) {
  return (
    <div role="status" aria-live="polite" className={`rounded-[1.75rem] ${shimmer} ${className}`} data-testid="block-skeleton">
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// A page's own header for the pages outside the market's bar (Cart,
// Checkout): a photo on an earthy shade, a back button, the title, and
// whatever the page puts on the right.
export function PhotoBand({ photo, eyebrow, title, onBack, right, testId }) {
  return (
    <div className="relative isolate overflow-hidden bg-night text-cream" data-testid={testId}>
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="100vw"
        alt=""
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_45%] motion-safe:animate-[harvest-header-in_1.4s_var(--ease-harvest)_both]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(12_28_19/0.88)_0%,rgb(15_36_24/0.7)_50%,rgb(31_26_18/0.45)_100%)]"
      />
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-8 max-sm:gap-3 max-sm:px-4 sm:py-10">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream/10 ring-1 ring-cream/25 backdrop-blur-sm transition-colors hover:bg-cream/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200 max-sm:hidden">{eyebrow}</p>}
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        </div>
        {right || <span className="w-10 shrink-0" aria-hidden="true" />}
      </div>
    </div>
  );
}
