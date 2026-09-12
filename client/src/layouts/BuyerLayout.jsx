import BuyerSidebar from "../components/buyer/BuyerSidebar";

export default function BuyerLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <BuyerSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
