import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import SmoothLink from "../SmoothLink";
import logo from "../../assets/logo-192.webp";
import { EASE } from "../../theme/harvest";

export const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "how-it-works", label: "How it works" },
  { id: "categories", label: "Categories" },
  { id: "about", label: "About" },
];

// The landing page's bar: see-through over the hero, then a frosted glass bar
// once the page has scrolled - dark over the dark sections and light over the
// light ones (each section says which it is, data-nav-tone), so it never sits
// as a grey band over cream. On a phone the links fold into a menu.
export default function LandingNav({ onJump }) {
  const [scrolled, setScrolled] = useState(false);
  const [tone, setTone] = useState("dark");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      setScrolled(window.scrollY > 24);
      // Whichever section is passing under the middle of the bar.
      const under = [...document.querySelectorAll("[data-nav-tone]")].find((section) => {
        const box = section.getBoundingClientRect();
        return box.top <= 36 && box.bottom > 36;
      });
      setTone(under?.dataset.navTone === "light" ? "light" : "dark");
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const jump = (id) => {
    setOpen(false);
    onJump(id);
  };
  const glass = scrolled || open;
  const light = glass && tone === "light";

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="fixed inset-x-0 top-0 z-40"
      data-testid="landing-nav"
      data-glass={glass}
      data-tone={light ? "light" : "dark"}
    >
      <div
        className={`transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-harvest ${
          !glass
            ? "border-b border-transparent bg-transparent"
            : light
              ? "border-b border-night/10 bg-cream/80 shadow-[0_10px_30px_-20px_rgb(15_36_24/0.35)] backdrop-blur-xl"
              : "border-b border-cream/10 bg-night/80 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.6)] backdrop-blur-xl"
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
          <button type="button" onClick={() => jump("home")} className="flex items-center gap-2.5" aria-label="AniSave - back to top">
            <img src={logo} alt="" className="h-9 w-9 rounded-full ring-2 ring-gold-400/40" />
            <span className={`font-display text-xl font-semibold tracking-tight transition-colors duration-500 ${light ? "text-night" : "text-cream"}`}>
              AniSave
            </span>
          </button>

          <ul className={`hidden items-center gap-8 text-[15px] font-medium transition-colors duration-500 md:flex ${light ? "text-gray-700" : "text-cream/80"}`}>
            {SECTIONS.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    jump(id);
                  }}
                  className={`harvest-underline py-1 transition-colors duration-200 ${light ? "hover:text-night" : "hover:text-cream"}`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            <SmoothLink
              to="/login"
              className={`hidden rounded-full px-4 py-2.5 text-sm font-semibold transition-colors sm:inline-flex ${light ? "text-night hover:text-forest-700" : "text-cream/90 hover:text-cream"}`}
            >
              Log in
            </SmoothLink>
            <SmoothLink
              to="/register"
              className="rounded-full bg-gold-400 px-5 py-2.5 text-sm font-bold text-night shadow-glow-gold transition-colors duration-200 hover:bg-gold-300"
            >
              Sign up
            </SmoothLink>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border md:hidden ${light ? "border-night/20 text-night" : "border-cream/20 text-cream"}`}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: EASE }}
              className={`border-t px-6 pb-6 pt-2 md:hidden ${light ? "border-night/10" : "border-cream/10"}`}
              data-testid="landing-menu"
            >
              <ul className="space-y-1">
                {SECTIONS.map(({ id, label }, i) => (
                  <motion.li
                    key={id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.04 * i, ease: EASE }}
                  >
                    <button
                      type="button"
                      onClick={() => jump(id)}
                      className={`w-full rounded-xl px-3 py-3 text-left font-display text-2xl font-semibold ${light ? "text-night" : "text-cream"}`}
                    >
                      {label}
                    </button>
                  </motion.li>
                ))}
              </ul>
              <SmoothLink
                to="/login"
                className={`mt-4 flex w-full items-center justify-center rounded-full border py-3 text-sm font-semibold ${light ? "border-night/20 text-night" : "border-cream/25 text-cream"}`}
              >
                Log in
              </SmoothLink>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
