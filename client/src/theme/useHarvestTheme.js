import { useLayoutEffect } from "react";

// How many mounted pages want the harvest look. A farmer moving from one page
// to the next unmounts one and mounts the other in the same commit, and the
// count keeps the class on <html> the whole time - set in a layout effect, so
// there is never a frame painted in the old colours in between.
let wanted = 0;

// Turns the "Premium Harvest" look on (theme/harvest.css) while the calling
// page is showing. It goes on <html> rather than on the page's own element so
// that what a page draws on <body> - a modal, say - gets it too.
export default function useHarvestTheme() {
  useLayoutEffect(() => {
    wanted += 1;
    document.documentElement.classList.add("harvest");
    return () => {
      wanted -= 1;
      if (wanted === 0) document.documentElement.classList.remove("harvest");
    };
  }, []);
}
