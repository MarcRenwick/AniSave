import { useSyncExternalStore } from "react";

// Whether a CSS media query matches right now, kept in step as the window is
// resized or a phone is turned.
export default function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

// Below Tailwind's `md` (768px): where the portals' sidebars become a drawer.
export const PHONE = "(max-width: 767.98px)";
