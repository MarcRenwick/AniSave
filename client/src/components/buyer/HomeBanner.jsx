import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ChevronLeft, ChevronRight, MapPin, Zap } from "lucide-react";
import { SERVER_URL } from "../../services/api";
import PriceTag from "../products/PriceTag";
import { unitOf, unitWord } from "../../utils/units";
import { BUYER_PHOTOS } from "../../utils/buyerPhotos";
import { EASE } from "../../theme/harvest";

const AUTO_ADVANCE_MS = 4000;

const ctaClass =
  "mt-5 w-fit rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-night shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)] transition-colors duration-200 hover:bg-gold-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-300/60";

// px-16 keeps slide text clear of the prev/next arrows.
// A little less on a phone, where every pixel of width counts.
const contentClass = "relative flex h-full max-w-md flex-col justify-center px-12 text-cream sm:px-16";

// A slide's photo: slowly closing in while its slide is showing, and (with
// the banner) drifting slower than the page as it scrolls. Loaded straight
// away - a slide waiting off to the side never comes near the screen to
// trigger a lazy load, and would arrive blank.
function SlidePhoto({ src, srcSet, alt = "", active, drift, first = false }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className="absolute -inset-y-[8%] inset-x-0" style={reduced ? undefined : { y: drift }}>
      <img
        src={src}
        srcSet={srcSet}
        sizes="(min-width: 1024px) 66vw, 100vw"
        alt={alt}
        fetchPriority={first ? "high" : undefined}
        decoding="async"
        className={`h-full w-full object-cover transition-transform ease-linear ${
          active && !reduced ? "scale-[1.08] duration-[7000ms]" : "scale-100 duration-700"
        }`}
      />
    </motion.div>
  );
}

// The words on a slide rise in each time it comes round.
function SlideWords({ active, className = contentClass, children }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      animate={active || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.6, delay: active ? 0.2 : 0, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// Earthy shade from the left, so the words read on any photo.
const SHADE = "absolute inset-0 bg-[linear-gradient(95deg,rgb(12_28_19/0.9)_0%,rgb(15_36_24/0.72)_42%,rgb(31_26_18/0.12)_100%)]";

function PhotoSlide({ photo, active, drift, first, children }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-night">
      <SlidePhoto src={photo.src} srcSet={photo.srcSet} active={active} drift={drift} first={first} />
      <div className={SHADE} />
      <SlideWords active={active}>{children}</SlideWords>
    </div>
  );
}

export default function HomeBanner({ featured, buyerLocation, onShop, onBrowse, onOpenProduct }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );

  // The photos drift down as the banner scrolls away.
  const bannerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: bannerRef, offset: ["start start", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);

  const count = 2 + featured.length;
  const current = index % count;

  const slides = [
    <PhotoSlide key="fresh" photo={BUYER_PHOTOS.marketProduce} active={current === 0} drift={drift} first>
      <h2 className="font-display text-3xl font-semibold leading-[1.05] sm:text-4xl">
        Fresh Crops.
        <br />
        Direct Access.
        <br />
        <span className="text-gold-300">Honest Prices.</span>
      </h2>
      <p className="mt-3 text-sm text-cream/90">
        Order 100% locally-grown produce straight from verified farmers, with no middleman markup.
      </p>
      <button type="button" onClick={onShop} className={ctaClass}>
        Shop Fresh Produce Now
      </button>
    </PhotoSlide>,

    <PhotoSlide key="preorder" photo={BUYER_PHOTOS.riceHarvest} active={current === 1} drift={drift}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Pre-Order</p>
      <h2 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">Reserve the next harvest</h2>
      <p className="mt-3 text-sm text-cream/90">
        Look for the Pre-Order tag to order produce before it&apos;s picked, then collect it once
        the farmer has it ready.
      </p>
      <button type="button" onClick={() => onBrowse("all")} className={ctaClass}>
        Browse All Products
      </button>
    </PhotoSlide>,

    // The product photo fills the whole slide; the text sits on it over a
    // shade that fades out, just enough to keep the words readable.
    ...featured.map(({ product, tag }, i) => (
      <div key={product._id} className="relative h-full w-full overflow-hidden bg-night">
        <SlidePhoto src={`${SERVER_URL}${product.image}`} alt={product.title} active={current === i + 2} drift={drift} />
        <div className={SHADE} />
        <SlideWords active={current === i + 2} className={`${contentClass} drop-shadow-md`}>
          <span className="w-fit rounded-full bg-gold-300 px-2.5 py-0.5 text-xs font-semibold text-night">
            {tag}
          </span>
          <h2 className="mt-3 line-clamp-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">{product.title}</h2>
          <p className="mt-1">
            <PriceTag product={product} tone="light" size="lg" suffix={` per ${unitWord(unitOf(product))}`} />
          </p>
          <p className="truncate text-sm text-cream/90">
            {product.farmer?.farmName || product.farmer?.name}
          </p>
          <button type="button" onClick={() => onOpenProduct(product._id)} className={ctaClass}>
            Shop Now
          </button>
        </SlideWords>
      </div>
    )),
  ];

  const go = (next) => setIndex((next + count) % count);

  // A timeout rather than an interval, keyed on the slide, so using the arrows
  // or dots restarts the countdown instead of jumping on right after.
  useEffect(() => {
    if (paused || reducedMotion || count < 2) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, paused, reducedMotion, count]);

  const tileClass =
    "group relative isolate flex flex-col justify-end overflow-hidden rounded-[1.5rem] p-5 text-left text-cream shadow-soft transition-shadow duration-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-300/60";
  const tilePhoto = "absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 ease-harvest group-hover:scale-[1.07]";

  return (
    <div className="grid gap-3 lg:grid-cols-3" ref={bannerRef}>
      {/* h-80 rather than the h-72 this started at: a little more room for the
          slide photos, and the two tiles beside it grow with it. */}
      <div
        className="group relative h-80 overflow-hidden rounded-[1.75rem] shadow-lift lg:col-span-2"
        aria-roledescription="carousel"
        aria-label="Featured on AniSave"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        data-testid="home-banner"
      >
        <div
          className="flex h-full transition-transform duration-700 ease-harvest"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.key}
              className="h-full w-full shrink-0"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              inert={i !== current}
            >
              {slide}
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(current - 1)}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-night/40 p-2 text-cream opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-night/60 focus-visible:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-night/40 p-2 text-cream opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-night/60 focus-visible:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === current}
                  className="relative h-2.5 w-2.5 rounded-full bg-cream/45 transition hover:bg-cream/80"
                >
                  {i === current && (
                    <motion.span
                      layoutId="banner-dot"
                      className="absolute inset-0 rounded-full bg-gold-300"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
        <button type="button" onClick={() => onBrowse("flash-sale")} className={`${tileClass} min-h-36`}>
          <img src={BUYER_PHOTOS.marketPrices.src} srcSet={BUYER_PHOTOS.marketPrices.srcSet} sizes="(min-width: 1024px) 30vw, 50vw" alt="" loading="lazy" decoding="async" className={tilePhoto} />
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgb(160_53_22/0.55)_0%,rgb(70_24_10/0.82)_100%)]" />
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/15 ring-1 ring-cream/25 backdrop-blur-sm">
            <Zap className="h-5 w-5 fill-gold-300 text-gold-300" />
          </span>
          <p className="mt-2 font-display text-xl font-semibold">Flash Sale</p>
          <p className="text-sm text-cream/90">Discounted listings while stocks last</p>
        </button>
        <button type="button" onClick={() => onBrowse("nearest")} className={`${tileClass} min-h-36`}>
          <img src={BUYER_PHOTOS.carabaoRoad.src} srcSet={BUYER_PHOTOS.carabaoRoad.srcSet} sizes="(min-width: 1024px) 30vw, 50vw" alt="" loading="lazy" decoding="async" className={tilePhoto} />
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgb(31_81_48/0.5)_0%,rgb(12_28_19/0.86)_100%)]" />
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/15 ring-1 ring-cream/25 backdrop-blur-sm">
            <MapPin className="h-5 w-5 text-gold-300" />
          </span>
          <p className="mt-2 font-display text-xl font-semibold">Nearest to You</p>
          <p className="truncate text-sm text-cream/90">
            {buyerLocation ? `Produce from farms near ${buyerLocation}` : "Produce from the farms closest to you"}
          </p>
        </button>
      </div>
    </div>
  );
}
