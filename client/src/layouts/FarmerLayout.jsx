import { useRef } from "react";
import FarmerSidebar from "../components/farmer/FarmerSidebar";
import useScrollReveal from "../hooks/useScrollReveal";

export default function FarmerLayout({ children }) {
  const mainRef = useRef(null);
  useScrollReveal(mainRef);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <FarmerSidebar />
      {/* min-h-0 so this flex child is allowed to be shorter than its content
          and actually scroll; without it a page taller than the window grows
          the child instead, and the scrollbar never appears. overflow-x-hidden
          keeps a hover-scaled card from producing a stray sideways scrollbar. */}
      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
        {children}
      </main>
    </div>
  );
}
