import { useRef } from "react";
import AdminSidebar from "../components/admin/AdminSidebar";
import useScrollReveal from "../hooks/useScrollReveal";

export default function AdminLayout({ children }) {
  const mainRef = useRef(null);
  useScrollReveal(mainRef);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main ref={mainRef} className="min-w-0 flex-1 overflow-x-clip">
        {children}
      </main>
    </div>
  );
}
