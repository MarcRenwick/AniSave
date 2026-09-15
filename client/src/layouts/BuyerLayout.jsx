import { useRef } from "react";
import BuyerTopNav from "../components/buyer/BuyerTopNav";
import Toast from "../components/Toast";
import { useBuyerOrderNotifications } from "../hooks/useBuyerOrderNotifications";
import useScrollReveal from "../hooks/useScrollReveal";

export default function BuyerLayout({ children }) {
  const { toast, dismiss } = useBuyerOrderNotifications();
  const mainRef = useRef(null);
  useScrollReveal(mainRef);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
      <BuyerTopNav />
      <main ref={mainRef} className="flex-1 overflow-y-auto scroll-smooth">
        {children}
      </main>
      {toast && <Toast message={toast} onClose={dismiss} />}
    </div>
  );
}
