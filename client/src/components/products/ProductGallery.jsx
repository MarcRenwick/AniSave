import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { SERVER_URL } from "../../services/api";
import { productImages } from "../../utils/productImages";

// variant "farmer" is the farmer's Product Details: a square main photo, 44px
// arrows and a green ring on the photo showing - and a magnifier: under the
// pointer the photo zooms in on the spot being pointed at, and a newly chosen
// photo fades in. The buyer's page keeps its look.
export default function ProductGallery({ product, variant = "buyer" }) {
  const farmer = variant === "farmer";
  const images = productImages(product);
  const [active, setActive] = useState(0);
  // Where the pointer is over the farmer's main photo, in %, or null.
  const [lens, setLens] = useState(null);

  if (images.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-gray-50 text-gray-300 ${farmer ? "aspect-square" : "h-72"}`}>
        <ImageOff className="h-16 w-16" />
      </div>
    );
  }

  const step = (delta) => setActive((i) => (i + delta + images.length) % images.length);

  return (
    <div>
      {farmer ? (
        <div
          className="flex aspect-square cursor-zoom-in items-center justify-center overflow-hidden rounded-xl bg-gray-50"
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
              className="h-full w-full object-contain transition-transform duration-500 ease-harvest"
              style={{ transform: lens ? "scale(1.6)" : "scale(1)", transformOrigin: lens ? `${lens.x}% ${lens.y}%` : "50% 50%" }}
            />
          </motion.div>
        </div>
      ) : (
        <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
          <img
            src={`${SERVER_URL}${images[active]}`}
            alt={`${product.title}, photo ${active + 1} of ${images.length}`}
            className="h-full w-full object-contain"
          />
        </div>
      )}

      {images.length > 1 && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous photo"
            className={
              farmer
                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                : "rounded bg-gray-100 p-1 text-gray-500 hover:bg-gray-200"
            }
          >
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
                className={
                  farmer
                    ? `h-14 w-14 shrink-0 overflow-hidden rounded-lg ${i === active ? "ring-2 ring-brand ring-offset-2" : "opacity-80 hover:opacity-100"}`
                    : `h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${i === active ? "border-red-500" : "border-transparent"}`
                }
              >
                <img src={`${SERVER_URL}${src}`} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next photo"
            className={
              farmer
                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                : "rounded bg-gray-100 p-1 text-gray-500 hover:bg-gray-200"
            }
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
