import { CountUp, Stagger, StaggerItem } from "../motion";

const STATS = [
  { key: "farmers", label: "Verified farmers", one: "Verified farmer" },
  { key: "products", label: "Products in the market", one: "Product in the market" },
  { key: "buyers", label: "Buyers", one: "Buyer" },
  { key: "municipalities", label: "Towns with farms", one: "Town with farms" },
];

// The real size of AniSave right now (GET /api/public/overview), counting up
// as it comes into view. While the numbers are on their way the strip holds
// its place; if they can't be had, or there is nothing to count yet, it isn't
// shown at all rather than showing a made-up number.
export default function StatsStrip({ overview }) {
  if (overview === false) return null;
  if (overview && !overview.farmers && !overview.products) return null;

  return (
    <section className="relative bg-night text-cream" aria-label="AniSave in numbers" data-testid="stats-strip" data-nav-tone="dark">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-4 sm:px-10">
        <Stagger
          className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-cream/10 bg-cream/10 lg:grid-cols-4"
          stagger={0.1}
        >
          {STATS.map(({ key, label, one }) => (
            <StaggerItem key={key} className="bg-night px-6 py-8 sm:px-8 sm:py-10" data-stat={key}>
              {overview ? (
                <>
                  <CountUp
                    value={overview[key]}
                    className="block font-display text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-none tracking-tight text-gold-300"
                    data-testid="stat-value"
                  />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-cream/70">
                    {overview[key] === 1 ? one : label}
                  </p>
                </>
              ) : (
                <div aria-hidden="true">
                  <div className="h-12 w-24 rounded-xl bg-cream/10 motion-safe:animate-pulse" />
                  <div className="mt-4 h-3 w-32 rounded bg-cream/10" />
                </div>
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
