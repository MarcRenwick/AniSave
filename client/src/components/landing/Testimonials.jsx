import { Star } from "lucide-react";
import { FadeIn, Marquee } from "../motion";

// Real reviews buyers left on AniSave products (4 or 5 stars, with a comment),
// as they already appear on each product's ratings page - by first name, with
// the farm they bought from. Two rows passing each other, which stop while
// one is pointed at. With fewer than three reviews there is no section.
function ReviewCard({ review }) {
  const { name, stars, comment, product, farm, town } = review;
  return (
    <figure className="harvest-card flex w-[300px] shrink-0 flex-col p-6 sm:w-[360px]" data-testid="review-card">
      <div className="flex gap-0.5 text-gold-500" aria-label={`${stars} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < stars ? "fill-current" : "text-gray-300"}`} />
        ))}
      </div>
      <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-gray-700">&ldquo;{comment}&rdquo;</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4 text-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 font-display font-semibold text-paper">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-night">{name}</span>
          <span className="block truncate text-gray-500">
            on {product} · {farm}
            {town ? `, ${town}` : ""}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

// A row has to be wider than the widest screen for its loop not to show a
// gap, so a short one is repeated until it is.
const fill = (list) => {
  let row = list;
  while (row.length * 320 < 2000) row = [...row, ...list];
  return row;
};

export default function Testimonials({ reviews }) {
  if (!Array.isArray(reviews) || reviews.length < 3) return null;
  const two = reviews.length >= 6;
  const first = fill(two ? reviews.filter((_, i) => i % 2 === 0) : reviews);
  const second = two ? fill(reviews.filter((_, i) => i % 2 === 1)) : [];

  return (
    <section className="harvest-grain relative overflow-hidden bg-sand py-24 sm:py-28" data-testid="testimonials" data-nav-tone="light">
      <FadeIn className="mx-auto max-w-3xl px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-500">From the market</p>
        <h2 className="mt-4 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-semibold leading-[1.04] tracking-tight text-night">
          What buyers are saying
        </h2>
      </FadeIn>
      <div className="relative mt-14 space-y-5">
        <Marquee seconds={Math.max(40, first.length * 9)}>
          {first.map((review, i) => (
            <ReviewCard key={`${review._id}-${i}`} review={review} />
          ))}
        </Marquee>
        {second.length > 0 && (
          <Marquee seconds={Math.max(46, second.length * 10)} reverse>
            {second.map((review, i) => (
              <ReviewCard key={`${review._id}-${i}`} review={review} />
            ))}
          </Marquee>
        )}
        {/* The rows fade out at the edges rather than being cut off. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-sand to-transparent sm:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-sand to-transparent sm:w-40" />
      </div>
    </section>
  );
}
