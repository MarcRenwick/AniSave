import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import logo from "../assets/logo-192.webp";
import useHarvestTheme from "../theme/useHarvestTheme";
import { EASE } from "../theme/harvest";
import login640 from "../assets/auth/login-farmer-golden-rice-640.webp";
import login1080 from "../assets/auth/login-farmer-golden-rice-1080.webp";
import register640 from "../assets/auth/register-market-vegetables-640.webp";
import register1080 from "../assets/auth/register-market-vegetables-1080.webp";

// Each page's photo (credits: assets/PHOTO_CREDITS.md).
const PHOTOS = {
  login: { small: login640, large: login1080, position: "object-[58%_62%]", alt: "A farmer carrying harvested rice through a golden field" },
  register: { small: register640, large: register1080, position: "object-[50%_45%]", alt: "Fresh vegetables at a market stall" },
};

// When the last auth page was left. Moving between them (Log in ↔ Sign up)
// is a View Transition (utils/pageTransition.js) that carries the photo and
// the card across by name, so the new page doesn't play its own entrance on
// top of that.
let leftAt = 0;

// The shared frame for Log in / Sign up / Forgot password, in the harvest
// look: a full-height photo with a welcome on one side and the form on a
// clean card on the other. On a phone the photo is a short header and the
// card rises over its foot. `wide` makes room for Sign up's two-column form;
// `aside` is shown on the photo on a wide screen (Sign up's steps).
export default function AuthShell({ tagline, blurb, aside, wide = false, photo = "login", children }) {
  useHarvestTheme();
  const reduced = useReducedMotion();
  const arriving = !reduced && Date.now() - leftAt > 1200;
  useEffect(() => () => {
    leftAt = Date.now();
  }, []);
  const picture = PHOTOS[photo] || PHOTOS.login;

  return (
    <div className="min-h-screen bg-cream lg:flex" data-testid="auth-shell">
      <div
        className="relative isolate h-60 overflow-hidden bg-night text-cream [view-transition-name:auth-photo] sm:h-72 lg:sticky lg:top-0 lg:h-screen lg:w-1/2"
        data-testid="auth-photo"
      >
        <motion.img
          key={photo}
          src={picture.large}
          srcSet={`${picture.small} 640w, ${picture.large} 1080w`}
          sizes="(min-width: 1024px) 50vw, 100vw"
          alt={picture.alt}
          fetchPriority="high"
          decoding="async"
          initial={arriving ? { opacity: 0, scale: 1.08 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: EASE }}
          className={`absolute inset-0 -z-10 h-full w-full object-cover ${picture.position}`}
        />
        {/* Earthy shade: enough at the top for the name, most at the foot for
            the welcome. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(15_36_24/0.78)_0%,rgb(15_36_24/0.3)_30%,rgb(31_26_18/0.64)_56%,rgb(15_20_12/0.92)_100%)]"
        />
        <div className="flex h-full flex-col justify-between p-5 pb-14 sm:p-8 sm:pb-16 lg:p-12">
          <Link to="/" className="flex w-fit items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-300/60">
            <img src={logo} alt="" className="h-10 w-10 rounded-full ring-2 ring-gold-300/60 sm:h-12 sm:w-12" />
            <span className="font-display text-xl font-semibold sm:text-2xl">AniSave</span>
          </Link>

          <motion.div
            initial={arriving ? { opacity: 0, y: 18 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
            className="max-w-md"
          >
            <p className="hidden text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200 sm:block">
              Farmers and buyers, side by side
            </p>
            <h2 className="mt-2 font-display text-[clamp(1.6rem,3.2vw,2.75rem)] font-semibold leading-[1.08] text-cream">
              {tagline || "Fresh food, straight from the farm."}
            </h2>
            <p className="mt-3 hidden max-w-sm text-[15px] leading-relaxed text-cream/85 sm:block">
              {blurb ||
                "Buy and sell local produce directly - no middlemen, fair prices, and you always know which farm it came from."}
            </p>
            {aside && <div className="hidden lg:block">{aside}</div>}
          </motion.div>
        </div>
      </div>

      <div className={`relative flex flex-1 flex-col justify-center px-4 pb-10 sm:px-8 lg:w-1/2 ${wide ? "lg:px-8 lg:py-3" : "lg:px-12 lg:py-12"}`}>
        <motion.div
          initial={arriving ? { opacity: 0, y: 28 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
          className={`relative mx-auto -mt-10 w-full rounded-[1.75rem] bg-paper p-6 shadow-lift ring-1 ring-gray-200 [view-transition-name:auth-card] sm:-mt-12 lg:mt-0 ${
            wide ? "max-w-xl sm:p-7 lg:px-7 lg:py-5" : "max-w-md sm:p-8"
          }`}
          data-testid="auth-card"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
