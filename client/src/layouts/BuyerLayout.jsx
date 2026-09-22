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
    // Near-white rather than grey: the marketplace cards carry their own
    // border now, so the page behind them can stay quiet.
    <div className="flex min-h-screen flex-col bg-gray-50">
      <BuyerTopNav />
      <main ref={mainRef} className="min-w-0 flex-1 overflow-x-clip">
        {children}
      </main>
      {toast && <Toast message={toast} onClose={dismiss} />}
    </div>
  );
}
