import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

// The shared frame for Log in / Sign up / Forgot password: a flat green brand
// panel beside the form, so all three pages read as one set. `wide` makes room
// for Sign up's two-column form; Log in stays narrow.
export default function AuthShell({ tagline, blurb, aside, wide = false, children }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-[#2f8f66] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-[#1f5c42]/40" />

        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="AniSave" className="h-12 w-12 rounded-full" />
            <span className="text-2xl font-bold">AniSave</span>
          </Link>

          <h2 className="mt-12 max-w-sm text-3xl font-bold leading-tight">
            {tagline || "Fresh food, straight from the farm."}
          </h2>
          <p className="mt-3 max-w-sm text-sm text-white/85">
            {blurb ||
              "Buy and sell local produce directly - no middlemen, fair prices, and you always know which farm it came from."}
          </p>

          {aside}
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-1/2 lg:px-16">
        <div className={`mx-auto w-full ${wide ? "max-w-xl" : "max-w-sm"}`}>{children}</div>
      </div>
    </div>
  );
}
