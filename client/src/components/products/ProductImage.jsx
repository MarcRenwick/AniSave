import { useEffect, useState } from "react";
import { cutout } from "../../utils/cutout";

// A listing's photo as a buyer sees it: the produce alone, with the backdrop
// it was photographed on taken out and the empty margins trimmed away.
//
// The original is what shows until - and unless - that works. A photo with no
// plain backdrop, one the tracing would ruin, or one that simply fails to be
// read stays exactly as the farmer uploaded it, so a card is never broken by
// this and never empty while it waits.
export default function ProductImage({ src, alt, className = "" }) {
  const [traced, setTraced] = useState({ src: null, url: null });

  useEffect(() => {
    let cancelled = false;
    cutout(src).then((url) => {
      if (!cancelled && url) setTraced({ src, url });
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  // Derived rather than stored, so a card showing a different listing can't
  // flash the last one's picture while its own is being traced.
  const shown = traced.src === src ? traced.url : src;

  return <img src={shown} alt={alt} className={className} />;
}
