import { useRef } from "react";
import FarmerSidebar from "../components/farmer/FarmerSidebar";
import useScrollReveal from "../hooks/useScrollReveal";

export default function FarmerLayout({ children }) {
  const mainRef = useRef(null);
  useScrollReveal(mainRef);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <FarmerSidebar />
      <main ref={mainRef} className="flex-1 overflow-y-auto scroll-smooth">
        {children}
      </main>
    </div>
  );
}
