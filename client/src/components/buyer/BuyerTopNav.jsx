import { Link, NavLink } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";

const linkClass = ({ isActive }) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition duration-150 active:scale-95 ${
    isActive ? "bg-[#8ee6b0] text-[#1f5c42]" : "text-white/90 hover:bg-white/10"
  }`;

export default function BuyerTopNav() {
  const { user } = useAuth();

  const navItems = [
    { to: "/buyer/home", label: "Home" },
    ...(user
      ? [
          { to: "/buyer/orders", label: "My Orders" },
          { to: "/buyer/settings", label: "Profile" },
        ]
      : []),
  ];

  return (
    <div className="flex shrink-0 items-center justify-between bg-[#2f8f66] px-8 py-3 text-white">
      <Link to="/buyer/home" className="flex items-center gap-2.5">
        <img src={logo} alt="AniSave" className="h-8 w-8 rounded-full" />
        <span className="font-semibold">AniSave</span>
      </Link>

      <nav className="flex items-center gap-1.5">
        {navItems.map(({ to, label }) => (
          <NavLink key={to} to={to} className={linkClass}>
            {label}
          </NavLink>
        ))}

        {!user && (
          <>
            <NavLink to="/login" className={linkClass}>
              Log In
            </NavLink>
            <NavLink
              to="/register"
              className="rounded-full bg-[#8ee6b0] px-4 py-1.5 text-sm font-semibold text-[#1f5c42] transition duration-150 hover:bg-[#7ad89e] active:scale-95"
            >
              Sign Up
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
}
