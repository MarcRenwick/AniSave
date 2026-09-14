import { useRef } from "react";
import AdminSidebar from "../components/admin/AdminSidebar";
import useScrollReveal from "../hooks/useScrollReveal";

export default function AdminLayout({ children }) {
  const mainRef = useRef(null);
  useScrollReveal(mainRef);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <AdminSidebar />
      <main ref={mainRef} className="flex-1 overflow-y-auto scroll-smooth">
        {children}
      </main>
    </div>
  );
}
