import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

// The farmer dashboard's figure cards, shared with the Profit page so the two
// read as one: white, a hairline border, a dark title - no coloured header
// bars, so green is kept for what can be clicked or chosen.
const CARD = "rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm";

// One of the four figures across the top: an icon, what it is, the number, and
// a line saying what the number means. A card with somewhere to go says so in
// its corner.
export function StatCard({ icon: Icon, label, link, onClick, testId, children }) {
  return (
    <div
      data-testid={testId}
      onClick={
        onClick &&
        ((e) => {
          // A link inside the card goes where it says, without the card
          // navigating a second time.
          if (!e.target.closest("a")) onClick();
        })
      }
      className={`flex flex-col ${CARD} ${onClick ? "cursor-pointer transition hover:shadow-md" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-[#2f8f66] ring-1 ring-green-100">
            <Icon className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-semibold text-gray-800">{label}</span>
        </div>
        {link && (
          <Link
            to={link.to}
            className="shrink-0 text-xs font-semibold text-[#2f8f66] underline underline-offset-2 hover:text-[#1f5c42]"
          >
            {link.label} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export const Figure = ({ children, tone = "text-gray-900" }) => (
  <p className={`mt-4 text-3xl font-bold tracking-tight ${tone}`}>{children}</p>
);
export const Caption = ({ children, tone = "text-gray-500" }) => <p className={`mt-1 text-xs ${tone}`}>{children}</p>;

// Something that needs doing, as a box with the way to do it - not just
// orange text that reads like any other line.
export function Warning({ to, action, children }) {
  return (
    <Link
      to={to}
      className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-100 transition hover:bg-amber-100"
    >
      <span className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {children}
      </span>
      <span className="shrink-0 font-semibold">{action} →</span>
    </Link>
  );
}
