import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Zap } from "lucide-react";
import fieldPhoto from "../../assets/lndingpge.jpg";
import farmPhoto from "../../assets/bckgrnd.jpg";
import { SERVER_URL } from "../../services/api";
import PriceTag from "../products/PriceTag";

const AUTO_ADVANCE_MS = 4000;

const ctaClass =
  "mt-5 w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#2f8f66] hover:bg-green-50";

// px-16 keeps slide text clear of the prev/next arrows.
const contentClass = "relative flex h-full max-w-md flex-col justify-center px-16 text-white";

function PhotoSlide({ photo, children }) {
  return (
    <div className="relative h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }}>
      <div className="absolute inset-0 bg-gradient-to-r from-[#1f5c42]/95 via-[#2f8f66]/80 to-transparent" />
      <div className={contentClass}>{children}</div>
    </div>
  );
}

export default function HomeBanner({ featured, buyerLocation, onShop, onBrowse, onOpenProduct }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );

  const slides = [
    <PhotoSlide key="fresh" photo={fieldPhoto}>
      <h2 className="text-3xl font-bold leading-tight">
        Fresh Crops.
        <br />
        Direct Access.
        <br />
        <span className="text-yellow-300">Honest Prices.</span>
      </h2>
      <p className="mt-3 text-sm text-white/90">
        Order 100% locally-grown produce straight from verified farmers, with no middleman markup.
      </p>
      <button type="button" onClick={onShop} className={ctaClass}>
        Shop Fresh Produce Now
      </button>
    </PhotoSlide>,

    <PhotoSlide key="preorder" photo={farmPhoto}>
      <p className="text-xs font-semibold uppercase tracking-wider text-yellow-300">Pre-Order</p>
      <h2 className="mt-1 text-3xl font-bold leading-tight">Reserve the next harvest</h2>
      <p className="mt-3 text-sm text-white/90">
        Look for the Pre-Order tag to order produce before it&apos;s picked, then collect it once
        the farmer has it ready.
      </p>
      <button type="button" onClick={() => onBrowse("all")} className={ctaClass}>
        Browse All Products
      </button>
    </PhotoSlide>,

    // The product photo fills the whole slide; the text sits on it over a
    // light shade that fades out, just enough to keep white text readable.
    ...featured.map(({ product, tag }) => (
      <div key={product._id} className="relative h-full w-full">
        <img
          src={`${SERVER_URL}${product.image}`}
          alt={product.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
        <div className={`${contentClass} drop-shadow-md`}>
          <span className="w-fit rounded-full bg-yellow-300 px-2.5 py-0.5 text-xs font-semibold text-[#1f5c42]">
            {tag}
          </span>
          <h2 className="mt-3 line-clamp-2 text-3xl font-bold leading-tight">{product.title}</h2>
          <p className="mt-1">
            <PriceTag product={product} tone="light" size="lg" suffix=" per kilo" />
          </p>
          <p className="truncate text-sm text-white/90">
            {product.farmer?.farmName || product.farmer?.name}
          </p>
          <button type="button" onClick={() => onOpenProduct(product._id)} className={ctaClass}>
            Shop Now
          </button>
        </div>
      </div>
    )),
  ];

  const count = slides.length;
  const current = index % count;
  const go = (next) => setIndex((next + count) % count);

  // A timeout rather than an interval, keyed on the slide, so using the arrows
  // or dots restarts the countdown instead of jumping on right after.
  useEffect(() => {
    if (paused || reducedMotion || count < 2) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, paused, reducedMotion, count]);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div
        className="group relative h-72 overflow-hidden rounded-2xl lg:col-span-2"
        aria-roledescription="carousel"
        aria-label="Featured on AniSave"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
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
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/40 focus-visible:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/40 focus-visible:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === current}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    i === current ? "bg-white" : "bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
        <button
          type="button"
          onClick={() => onBrowse("flash-sale")}
          className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 p-5 text-left text-white"
        >
          <Zap className="h-7 w-7 fill-white" />
          <p className="mt-2 text-lg font-bold">Flash Sale</p>
          <p className="text-sm text-white/90">Discounted listings while stocks last</p>
        </button>
        <button
          type="button"
          onClick={() => onBrowse("nearest")}
          className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-[#2f8f66] p-5 text-left text-white"
        >
          <MapPin className="h-7 w-7" />
          <p className="mt-2 text-lg font-bold">Nearest to You</p>
          <p className="truncate text-sm text-white/90">
            {buyerLocation ? `Produce from farms near ${buyerLocation}` : "Produce from the farms closest to you"}
          </p>
        </button>
      </div>
    </div>
  );
}
