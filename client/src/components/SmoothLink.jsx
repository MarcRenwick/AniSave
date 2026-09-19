import { Link, useNavigate } from "react-router-dom";
import { withPageTransition } from "../utils/pageTransition";

// A <Link> whose page change eases in (see utils/pageTransition.js). It is
// still a real link, so opening it in a new tab, or with Ctrl/Cmd/Shift held,
// works exactly as it does for any other link.
export default function SmoothLink({ to, replace, target, onClick, ...props }) {
  const navigate = useNavigate();

  const handleClick = (event) => {
    onClick?.(event);
    const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (event.defaultPrevented || !plainClick || (target && target !== "_self")) return;

    event.preventDefault();
    withPageTransition(() => navigate(to, { replace }));
  };

  return <Link to={to} replace={replace} target={target} onClick={handleClick} {...props} />;
}
