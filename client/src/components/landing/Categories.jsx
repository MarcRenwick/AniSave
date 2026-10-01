import { ArrowUpRight } from "lucide-react";
import SmoothLink from "../SmoothLink";
import { FadeIn, Stagger, StaggerItem, TiltCard } from "../motion";
import { EggArt, FruitArt, MeatArt, SeafoodArt, VegetableArt } from "./CategoryArt";

// The marketplace's own five categories (utils/categories.js), each in its
// colour. Grains and root crops are sold with the vegetables, as they are in
// the market.
const CATEGORIES = [
  {
    key: "vegetable",
    label: "Vegetables",
    examples: "Eggplant, kangkong, ampalaya - plus rice, corn and root crops",
    Art: VegetableArt,
    background: "radial-gradient(120% 95% at 50% 0%, #4f9a55 0%, #1f5130 55%, #0f2418 100%)",
    glow: "#2e7d32",
    span: "lg:col-span-3",
  },
  {
    key: "fruit",
    label: "Fruits",
    examples: "Mango, banana, calamansi, papaya",
    Art: FruitArt,
    background: "radial-gradient(120% 95% at 50% 0%, #f08a5d 0%, #c4421a 52%, #5e1f0e 100%)",
    glow: "#e4572e",
    span: "lg:col-span-3",
  },
  {
    key: "egg",
    label: "Eggs",
    examples: "Chicken, duck and quail eggs - by the tray",
    Art: EggArt,
    background: "radial-gradient(120% 95% at 50% 0%, #f2c14e 0%, #b8761a 52%, #4f3209 100%)",
    glow: "#e8a33d",
    span: "lg:col-span-2",
  },
  {
    key: "meat",
    label: "Meat",
    examples: "Pork, beef, chicken and goat",
    Art: MeatArt,
    background: "radial-gradient(120% 95% at 50% 0%, #c8474e 0%, #9b2226 50%, #3d0b0e 100%)",
    glow: "#9b2226",
    span: "lg:col-span-2",
  },
  {
    key: "seafood",
    label: "Seafood",
    examples: "Bangus, tilapia, shrimp and crab",
    Art: SeafoodArt,
    background: "radial-gradient(120% 95% at 50% 0%, #2fa9b1 0%, #0e7c86 50%, #04363b 100%)",
    glow: "#0e7c86",
    span: "lg:col-span-2 sm:col-span-2",
  },
];

// "Shop by category": a big card per category that tilts toward the mouse,
// its drawing growing a little and a glow in its colour coming up behind it.
// Each opens the market.
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
          {CATEGORIES.map(({ key, label, examples, Art, background, glow, span }) => (
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
                  className="group relative flex h-full min-h-[22rem] flex-col justify-between overflow-hidden rounded-[1.75rem] p-6 text-cream shadow-lift sm:min-h-[24rem] sm:p-7"
                  style={{ background }}
                  aria-label={`Shop ${label.toLowerCase()}`}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="rounded-full border border-cream/25 bg-cream/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cream/90 backdrop-blur-sm">
                      Shop
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream text-night transition-transform duration-500 ease-harvest group-hover:rotate-45">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </div>
                  <Art className="pointer-events-none absolute left-1/2 top-[44%] w-[min(78%,15rem)] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_18px_24px_rgb(0_0_0/0.35)] transition-transform duration-700 ease-harvest group-hover:scale-110" />
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
