import { NavLink } from "react-router-dom";
import { LayoutGrid, Package, ShoppingBag } from "lucide-react";
import logo from "../../assets/logo.png";

const navItems = [
  { to: "/farmer/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/farmer/products", label: "Products", icon: Package },
  { to: "/farmer/orders", label: "Orders", icon: ShoppingBag },
];

export default function FarmerSidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[#2f8f66] px-4 py-6 text-white">
      <div className="flex items-center gap-3 px-2">
        <img src={logo} alt="AniSave" className="h-10 w-10 rounded-full" />
        <div className="leading-tight">
          <p className="font-semibold">AniSave</p>
          <p className="text-xs text-white/80">Farmer Portal</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-col gap-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive ? "bg-[#8ee6b0] text-[#1f5c42]" : "text-white/90 hover:bg-white/10"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
