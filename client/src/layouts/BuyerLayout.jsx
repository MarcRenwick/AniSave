import BuyerSidebar from "../components/buyer/BuyerSidebar";
import Toast from "../components/Toast";
import { useBuyerOrderNotifications } from "../hooks/useBuyerOrderNotifications";

export default function BuyerLayout({ children }) {
  const { toast, dismiss } = useBuyerOrderNotifications();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <BuyerSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      {toast && <Toast message={toast} onClose={dismiss} />}
    </div>
  );
}
