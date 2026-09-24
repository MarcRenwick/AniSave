import { useRef } from "react";
import FarmerSidebar from "../components/farmer/FarmerSidebar";
import useScrollReveal from "../hooks/useScrollReveal";

// mainClassName: a page's own backdrop behind its content (the Profile page's fields).
export default function FarmerLayout({ children, mainClassName = "" }) {
  const mainRef = useRef(null);
  useScrollReveal(mainRef);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <FarmerSidebar />
      {/* overflow-x-clip keeps a hover-scaled card from poking out sideways
          without making this a second scroll container. */}
      <main ref={mainRef} className={`min-w-0 flex-1 overflow-x-clip ${mainClassName}`}>
        {children}
      </main>
    </div>
  );
}
