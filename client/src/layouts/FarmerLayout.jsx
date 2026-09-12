import FarmerSidebar from "../components/farmer/FarmerSidebar";

export default function FarmerLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <FarmerSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
