import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { SERVER_URL } from "../../services/api";
import { productImages } from "../../utils/productImages";

// variant "farmer" is the farmer's Product Details: a square main photo, 44px
// arrows and a green ring on the photo showing. The buyer's page keeps its look.
export default function ProductGallery({ product, variant = "buyer" }) {
  const farmer = variant === "farmer";
  const images = productImages(product);
  const [active, setActive] = useState(0);

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
      <div className={`flex items-center justify-center overflow-hidden rounded-xl bg-gray-50 ${farmer ? "aspect-square" : "h-72"}`}>
        <img
          src={`${SERVER_URL}${images[active]}`}
          alt={`${product.title}, photo ${active + 1} of ${images.length}`}
          className="h-full w-full object-contain"
        />
      </div>

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
                    ? `h-14 w-14 shrink-0 overflow-hidden rounded-lg ${i === active ? "ring-2 ring-[#2f8f66] ring-offset-2" : "opacity-80 hover:opacity-100"}`
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
