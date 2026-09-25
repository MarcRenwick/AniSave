import { useRef } from "react";
import { Leaf, Users, Search, ShoppingBasket, Package, ArrowUpRight, Sprout } from "lucide-react";
import SmoothLink from "../components/SmoothLink";
import heroImage from "../assets/lndingpge.jpg";
import logo from "../assets/logo.png";
import useScrollReveal from "../hooks/useScrollReveal";

const steps = [
  { icon: Search, title: "Browse", text: "Explore fresh produce listed directly by local farmers." },
  { icon: ShoppingBasket, title: "Order", text: "Add items to your cart and check out to reserve your order." },
  { icon: Package, title: "Pick Up", text: "Head to the farmer's location and collect your order when it's ready." },
];

export default function Landing() {
  const rootRef = useRef(null);
  useScrollReveal(rootRef);

  return (
    <div ref={rootRef} className="min-h-screen bg-white">
      <div id="home" className="relative overflow-hidden">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />

        <div className="relative flex min-h-screen flex-col">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
            <div className="flex items-center gap-2">
              <img src={logo} alt="AniSave" className="h-9 w-9 rounded-full" />
              <span className="text-lg font-semibold text-white">AniSave</span>
            </div>
            <div className="hidden items-center gap-8 text-base font-medium text-white/90 md:flex">
              <a href="#home" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
                Home
              </a>
              <a
                href="#how-it-works"
                className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white"
              >
                How It Works
              </a>
              <a href="#about" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
                About
              </a>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <SmoothLink
                to="/register"
                className="rounded-full border border-white/70 px-4 py-2.5 text-sm font-medium text-white transition duration-150 hover:bg-white/10 active:scale-95 sm:px-6 sm:text-base"
              >
                Sign Up
              </SmoothLink>
              <SmoothLink
                to="/login"
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#1f5c42] transition duration-150 hover:bg-green-50 active:scale-95 sm:px-6 sm:text-base"
              >
                Log In
              </SmoothLink>
            </div>
          </nav>

          <div className="mx-auto flex w-full max-w-7xl flex-1 items-end px-6 pb-16 pt-10 sm:px-10 sm:pb-24">
            <div className="grid w-full items-end gap-10 md:grid-cols-2">
              <div>
                <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
                  Fresh From Farm,
                  <br />
                  Straight To You.
                </h1>
                <p className="mt-4 max-w-md text-sm text-white/80 sm:text-base">
                  AniSave connects local farmers directly with buyers nearby - no
                  middlemen, fair prices, and produce reserved fresh for pickup.
                </p>
                <SmoothLink
                  to="/register"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#8ee6b0] px-6 py-3 text-sm font-semibold text-[#1f5c42] transition duration-150 hover:bg-[#7ad89e] active:scale-95"
                >
                  Get Started
                  <ArrowUpRight className="h-4 w-4" />
                </SmoothLink>
              </div>

              <div className="w-full max-w-xs rounded-2xl bg-white/95 p-5 shadow-2xl backdrop-blur md:ml-auto">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-[#2f8f66]">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Locally Grown Produce</p>
                    <p className="text-xs text-gray-500">Picked fresh by real farmers</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-[#2f8f66]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Verified Farmers</p>
                    <p className="text-xs text-gray-500">Reviewed before they can sell</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#2f8f66] px-4 py-3 text-sm font-semibold text-white">
                  <Package className="h-4 w-4" />
                  Easy Pickup
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
        <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">How It Works</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-500">
          Three simple steps from a farmer&apos;s field to your table.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-[#2f8f66]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="bg-[#f4faf6] px-6 py-20 sm:px-10">
        <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">About AniSave</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base">
              AniSave is a farm-to-buyer marketplace that lets local farmers list and
              sell their produce directly to nearby buyers. By cutting out the
              middlemen, farmers earn more from every sale and buyers get produce
              that&apos;s fresher and more affordable.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-[#2f8f66]">
              <Leaf className="h-4 w-4" />
              Supporting local farming communities
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-lg">
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <footer className="bg-[#1f5c42] px-6 py-8 text-white/80 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center text-sm sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <img src={logo} alt="AniSave" className="h-6 w-6 rounded-full" />
            <span className="font-semibold text-white">AniSave</span>
          </div>
          <p>&copy; {new Date().getFullYear()} AniSave. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
