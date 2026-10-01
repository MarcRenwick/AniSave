import { ArrowUp } from "lucide-react";
import SmoothLink from "../SmoothLink";
import { FadeIn } from "../motion";
import logo from "../../assets/logo-192.webp";
import { SECTIONS } from "./LandingNav";

const LINK = "transition-colors duration-200 hover:text-cream";

export default function LandingFooter({ onJump }) {
  return (
    <footer className="relative bg-night-800 text-sm text-cream/70" data-testid="landing-footer" data-nav-tone="dark">
      <FadeIn y={30} className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-10 w-10 rounded-full ring-2 ring-gold-400/40" />
            <span className="font-display text-2xl font-semibold text-cream">AniSave</span>
          </div>
          <p className="mt-4 max-w-sm leading-relaxed">
            A farm-to-buyer marketplace for local growers and the people who buy from them.
          </p>
        </div>
        <nav className="md:col-span-3" aria-label="On this page">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Explore</p>
          <ul className="mt-4 space-y-2.5">
            {SECTIONS.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onJump(id);
                  }}
                  className={LINK}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav className="md:col-span-2" aria-label="Account">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Account</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <SmoothLink to="/register" className={LINK}>
                Sign up
              </SmoothLink>
            </li>
            <li>
              <SmoothLink to="/login" className={LINK}>
                Log in
              </SmoothLink>
            </li>
            <li>
              <SmoothLink to="/buyer/home" className={LINK}>
                Browse the market
              </SmoothLink>
            </li>
          </ul>
        </nav>
        <nav className="md:col-span-2" aria-label="Legal">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Legal</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <SmoothLink to="/privacy" className={LINK}>
                Privacy
              </SmoothLink>
            </li>
            <li>
              <SmoothLink to="/terms" className={LINK}>
                Terms
              </SmoothLink>
            </li>
          </ul>
        </nav>
      </FadeIn>
      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10">
          <p>&copy; {new Date().getFullYear()} AniSave. All rights reserved.</p>
          <button
            type="button"
            onClick={() => onJump("home")}
            className="inline-flex items-center gap-2 rounded-full border border-cream/15 px-4 py-2 font-semibold text-cream/80 transition-colors hover:border-cream/40 hover:text-cream"
          >
            Back to top
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
