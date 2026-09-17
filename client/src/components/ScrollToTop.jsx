import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// All pages share the window's scroll position, so without this a new page
// would open wherever the previous one was scrolled to. Keyed on pathname
// only - not the query string - so picking a filter/sort on the same page
// (e.g. buyer Home) doesn't yank the scroll position back to the top.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
