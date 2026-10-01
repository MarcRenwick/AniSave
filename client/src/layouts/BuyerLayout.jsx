import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import BuyerTopNav from "../components/buyer/BuyerTopNav";
import Toast from "../components/Toast";
import { useBuyerOrderNotifications } from "../hooks/useBuyerOrderNotifications";
import useScrollReveal from "../hooks/useScrollReveal";
import useHarvestTheme from "../theme/useHarvestTheme";
import { EASE } from "../theme/harvest";

// Every buyer page sits in this: the market's bar, and the page on the
// harvest look's warm cream (theme/harvest.css). Each page eases up into
// place as it opens, and its sections and cards rise in as they are scrolled
// to (useScrollReveal, a little fuller here than on the farmer's pages).
export default function BuyerLayout({ children }) {
  useHarvestTheme();
  const { toast, dismiss } = useBuyerOrderNotifications();
  const mainRef = useRef(null);
  useScrollReveal(mainRef);
  const reduced = useReducedMotion();

  return (
    <div className="buyer-field harvest-grain flex min-h-screen flex-col bg-cream" data-testid="buyer-layout">
      <BuyerTopNav />
      {/* The page fades up as it opens - opacity only: a transform here would
          become the containing block for every modal on the page while it
          played. Its own sections are still main's children, so they reveal
          one by one as before. */}
      <motion.main
        ref={mainRef}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="min-w-0 flex-1 overflow-x-clip"
      >
        {children}
      </motion.main>
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onClose={dismiss} />}</AnimatePresence>
    </div>
  );
}
