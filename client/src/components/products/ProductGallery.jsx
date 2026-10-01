import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { SERVER_URL } from "../../services/api";
import { productImages } from "../../utils/productImages";
import { categoryPhoto } from "../../utils/categoryPhotos";

// A listing's photos, one large with the rest as thumbnails. Under the
// pointer the photo zooms in on the spot being pointed at (a magnifier), and
// a newly chosen photo fades in. variant "farmer" is the farmer's Product
// Details (a square photo); the buyer's is a wide frame on a warm backdrop,
// and a listing with no photo yet shows a market photo of its category,
// marked as such.
export default function ProductGallery({ product, variant = "buyer" }) {
  const farmer = variant === "farmer";
  const images = productImages(product);
  const [active, setActive] = useState(0);
  // Where the pointer is over the main photo, in %, or null.
  const [lens, setLens] = useState(null);

  if (images.length === 0) {
    if (farmer) {
      return (
        <div className="flex aspect-square items-center justify-center rounded-xl bg-gray-50 text-gray-300">
          <ImageOff className="h-16 w-16" />
        </div>
      );
    }
    const stand = categoryPhoto(product.category);
    return (
      <div className="relative h-80 overflow-hidden rounded-[1.5rem] sm:h-96" data-testid="gallery-fallback">
        <img src={stand.src} srcSet={stand.srcSet} sizes="(min-width: 768px) 45vw, 100vw" alt={stand.alt} className="h-full w-full object-cover" />
        <span className="absolute bottom-3 left-3 rounded-full bg-night/60 px-3 py-1 text-xs font-semibold text-cream backdrop-blur-sm">
          No photo yet
        </span>
      </div>
    );
  }

  const step = (delta) => setActive((i) => (i + delta + images.length) % images.length);
  const arrow = farmer
    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-paper text-gray-600 transition-colors hover:border-brand hover:text-brand";

  return (
    <div>
      <div
        className={`flex cursor-zoom-in items-center justify-center overflow-hidden ${
          farmer ? "aspect-square rounded-xl bg-gray-50" : "h-80 rounded-[1.5rem] bg-[radial-gradient(120%_90%_at_50%_100%,#f3ebdc_0%,#faf7f0_70%)] sm:h-96"
        }`}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          setLens({ x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 100 });
        }}
        onPointerLeave={() => setLens(null)}
        data-testid="zoom-frame"
      >
        <motion.div
          key={active}
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <img
            src={`${SERVER_URL}${images[active]}`}
            alt={`${product.title}, photo ${active + 1} of ${images.length}`}
            className={`h-full w-full object-contain transition-transform duration-500 ease-harvest ${farmer ? "" : "drop-shadow-[0_18px_22px_rgb(60_40_20/0.2)]"}`}
            style={{ transform: lens ? "scale(1.6)" : "scale(1)", transformOrigin: lens ? `${lens.x}% ${lens.y}%` : "50% 50%" }}
          />
        </motion.div>
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={arrow}>
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-1 justify-center gap-2 overflow-x-auto p-1">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={`h-14 w-14 shrink-0 overflow-hidden ${farmer ? "rounded-lg" : "rounded-xl"} ${
                  i === active ? "ring-2 ring-brand ring-offset-2" : "opacity-80 hover:opacity-100"
                }`}
              >
                <img src={`${SERVER_URL}${src}`} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <button type="button" onClick={() => step(1)} aria-label="Next photo" className={arrow}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
