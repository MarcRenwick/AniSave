import { useRef } from "react";
import AdminSidebar from "../components/admin/AdminSidebar";
import useScrollReveal from "../hooks/useScrollReveal";

export default function AdminLayout({ children }) {
  const mainRef = useRef(null);
  useScrollReveal(mainRef);

  return (
    // On a phone the sidebar becomes a bar across the top (with a drawer), so
    // the page stacks under it instead of sitting beside it.
    <div className="flex min-h-screen bg-gray-100 max-md:flex-col">
      <AdminSidebar />
      <main ref={mainRef} className="min-w-0 flex-1 overflow-x-clip">
        {children}
      </main>
    </div>
  );
}
