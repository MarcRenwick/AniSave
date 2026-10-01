// The add-to-cart flourish: a copy of the product's photo flies from the page
// to the cart in the bar. A page marks the photo it flies from with
// `data-fly-source`; nothing else about adding to the cart is involved - the
// bar simply notices the cart's count going up (BuyerTopNav). Returns whether
// anything flew, so the bar knows to bump its count as it lands.
const FLIGHT_MS = 760;

export function flyToCart(target) {
  if (!target || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  const source = document.querySelector("[data-fly-source]");
  if (!source) return false;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || from.bottom < 0 || from.top > window.innerHeight) return false;

  const picture = source.tagName === "IMG" ? source : source.querySelector("img");
  const ghost = picture ? picture.cloneNode() : document.createElement("div");
  const size = Math.min(from.width, from.height, 132);
  ghost.removeAttribute("data-fly-source");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "cover",
    borderRadius: "9999px",
    background: "#fffdf8",
    boxShadow: "0 18px 40px -12px rgb(15 36 24 / 0.55)",
    zIndex: "60",
    pointerEvents: "none",
  });
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  // Up and over in an arc, shrinking into the basket.
  const flight = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(0.62)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.14)`, opacity: 0.35 },
    ],
    { duration: FLIGHT_MS, easing: "cubic-bezier(0.55, 0, 0.3, 1)" }
  );
  flight.onfinish = () => ghost.remove();
  flight.oncancel = () => ghost.remove();
  return true;
}

export const FLIGHT_LANDS_MS = FLIGHT_MS - 80;
