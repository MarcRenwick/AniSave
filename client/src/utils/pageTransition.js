import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Resolves once the page has finished changing: the DOM has gone quiet after
// the last update. React Router applies a navigation as a React transition, so
// it lands a moment after navigate() returns - and the browser has to wait for
// that before it takes its picture of the new page.
function pageSettled() {
  return new Promise((resolve) => {
    let quiet;
    let cap;
    const finish = () => {
      observer.disconnect();
      clearTimeout(quiet);
      clearTimeout(cap);
      resolve();
    };
    const observer = new MutationObserver(() => {
      clearTimeout(quiet);
      quiet = setTimeout(finish, 50);
    });
    observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
    quiet = setTimeout(finish, 200); // nothing changed at all (same page)
    cap = setTimeout(finish, 700); // never hold the page still for long
  });
}

// Runs a page change (a navigation, or logging out and then navigating) inside
// the browser's View Transition, so the page being left fades out while the
// next one eases in, instead of one snapping to the other. Where the browser
// can't do that - or the person has asked their system for less motion - the
// change simply happens, as before.
export function withPageTransition(update) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (typeof document.startViewTransition !== "function" || reducedMotion) {
    update();
    return;
  }

  const transition = document.startViewTransition(async () => {
    update();
    await pageSettled();
  });
  // A transition can be skipped (another one started, the tab was hidden);
  // that isn't an error worth surfacing.
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
}

// navigate(), but with that page transition.
export function useSmoothNavigate() {
  const navigate = useNavigate();
  return useCallback((to, options) => withPageTransition(() => navigate(to, options)), [navigate]);
}

// The back arrow on a page you step into (a report form, say). It goes back the
// way the browser's own Back button would, instead of adding another entry to
// the history - otherwise Back from the page you just returned to would lead
// forwards, into the page you had left. When there is nothing of ours to go
// back to (the page was opened from a pasted link or a new tab), it goes to
// where the page belongs, without leaving an entry behind.
export function useSmoothBack(fallback) {
  const navigate = useNavigate();
  return useCallback(() => {
    const canGoBack = (window.history.state?.idx ?? 0) > 0;
    withPageTransition(() => (canGoBack ? navigate(-1) : navigate(fallback, { replace: true })));
  }, [navigate, fallback]);
}
