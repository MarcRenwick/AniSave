import { ArrowUpRight } from "lucide-react";
import SmoothLink from "../SmoothLink";
import { FadeIn, Stagger, StaggerItem, TiltCard } from "../motion";
import { CATEGORY_PHOTOS } from "../../utils/categoryPhotos";

// The marketplace's own five categories (utils/categories.js), each with a
// photo from the market and a soft glow in an earthy colour of its own.
// Grains and root crops are sold with the vegetables, as they are in the
// market.
const CATEGORIES = [
  {
    key: "vegetable",
    label: "Vegetables",
    examples: "Eggplant, kangkong, ampalaya - plus rice, corn and root crops",
    glow: "#3b8a43",
    span: "lg:col-span-3",
  },
  {
    key: "fruit",
    label: "Fruits",
    examples: "Mango, banana, calamansi, papaya",
    glow: "#e8a33d",
    span: "lg:col-span-3",
  },
  {
    key: "egg",
    label: "Eggs",
    examples: "Chicken, duck and quail eggs - by the tray",
    glow: "#c9a46a",
    span: "lg:col-span-2",
  },
  {
    key: "meat",
    label: "Meat",
    examples: "Pork, beef, chicken and goat",
    glow: "#a0522d",
    span: "lg:col-span-2",
  },
  {
    key: "seafood",
    label: "Seafood",
    examples: "Bangus, tilapia, shrimp and crab",
    glow: "#4f7f78",
    span: "lg:col-span-2 sm:col-span-2",
  },
];

// "Shop by category": a big card per category that tilts toward the mouse,
// its photo easing in a little closer and a glow in its colour coming up
// behind it. Each opens the market.
export default function Categories() {
  return (
    <section id="categories" className="harvest-grain relative overflow-hidden bg-sand py-24 sm:py-32" data-testid="categories" data-nav-tone="light">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <FadeIn className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-500">Shop by category</p>
            <h2 className="mt-4 font-display text-[clamp(2.2rem,4.6vw,3.8rem)] font-semibold leading-[1.02] tracking-tight text-night">
              Everything from the field, in one market
            </h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-gray-600">
            Fresh produce, eggs by the tray, meat and seafood - straight from the farms near you.
          </p>
        </FadeIn>

        <Stagger
          className="-mx-6 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6"
          stagger={0.09}
        >
          {CATEGORIES.map(({ key, label, examples, glow, span }) => (
            <StaggerItem key={key} className={`group/cat relative w-[78vw] shrink-0 snap-center sm:w-auto ${span}`} data-category={key}>
              {/* The glow, behind the card - it fades in rather than repainting. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-8 bottom-0 top-10 rounded-[2rem] opacity-0 blur-2xl transition-opacity duration-500 group-hover/cat:opacity-80"
                style={{ background: glow }}
              />
              <TiltCard className="h-full rounded-[1.75rem]" max={7}>
                <SmoothLink
                  to="/buyer/home"
                  className="group relative flex h-full min-h-[22rem] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-soil-700 p-6 text-cream shadow-lift sm:min-h-[24rem] sm:p-7"
                  aria-label={`Shop ${label.toLowerCase()}`}
                >
                  <img
                    src={CATEGORY_PHOTOS[key].src}
                    srcSet={CATEGORY_PHOTOS[key].srcSet}
                    sizes="(min-width: 1024px) 40vw, (min-width: 640px) 48vw, 80vw"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    data-testid="category-photo"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-harvest group-hover:scale-[1.07]"
                  />
                  {/* Earthy shade: a little at the top for the label, more at
                      the foot for the name. */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(15_36_24/0.5)_0%,rgb(15_36_24/0.08)_32%,rgb(31_26_18/0.18)_55%,rgb(20_17_11/0.86)_100%)]"
                  />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="rounded-full border border-cream/25 bg-cream/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cream/90 backdrop-blur-sm">
                      Shop
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-night transition-transform duration-500 ease-harvest group-hover:rotate-45">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="relative z-10 -mx-6 -mb-6 bg-gradient-to-t from-black/50 via-black/20 to-transparent px-6 pb-6 pt-16 sm:-mx-7 sm:-mb-7 sm:px-7 sm:pb-7">
                    <h3 className="font-display text-3xl font-semibold tracking-tight">{label}</h3>
                    <p className="mt-1.5 text-sm leading-snug text-cream/85">{examples}</p>
                  </div>
                </SmoothLink>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
