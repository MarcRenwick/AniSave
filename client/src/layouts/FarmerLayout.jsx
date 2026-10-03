import { useRef } from "react";
import { AnimatePresence } from "motion/react";
import FarmerSidebar from "../components/farmer/FarmerSidebar";
import Toast from "../components/Toast";
import { useFarmerOrderAlerts } from "../hooks/useFarmerOrderAlerts";
import useScrollReveal from "../hooks/useScrollReveal";
import useHarvestTheme from "../theme/useHarvestTheme";

// Every farmer page sits in this: the sidebar, and the page on the harvest
// look's cream field (theme/harvest.css), its sections easing in as they
// come into view - quick, so a farmer at work never waits for one. A buyer
// ordering or cancelling pops up a toast on whichever page is open.
// mainClassName: a page's own backdrop behind its content (the Profile page's fields).
export default function FarmerLayout({ children, mainClassName = "" }) {
  useHarvestTheme();
  const mainRef = useRef(null);
  useScrollReveal(mainRef);
  const { toast, dismiss } = useFarmerOrderAlerts();

  return (
    // On a phone the sidebar becomes a bar across the top (with a drawer), so
    // the page stacks under it instead of sitting beside it.
    <div className="harvest-field flex min-h-screen max-md:flex-col" data-testid="farmer-layout">
      <FarmerSidebar />
      {/* overflow-x-clip keeps a hover-lifted card from poking out sideways
          without making this a second scroll container. */}
      <main ref={mainRef} className={`min-w-0 flex-1 overflow-x-clip ${mainClassName}`}>
        {children}
      </main>
      <AnimatePresence>{toast && <Toast key={toast.id} message={toast.message} onClose={dismiss} />}</AnimatePresence>
    </div>
  );
}
