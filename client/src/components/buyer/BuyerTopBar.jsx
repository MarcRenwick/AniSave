import { Search } from "lucide-react";

// The white sub-header under the green nav: a page heading or back button,
// plus an optional page-specific search (the shop page's "search in this
// shop"). Site-wide search, the cart and Profile all live in the green nav.
export default function BuyerTopBar({ children, search, onSearchChange, searchPlaceholder = "Search" }) {
  return (
    // On a narrow screen the page's own search drops under the heading.
    <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 px-4 py-5 sm:px-8 sm:py-6">
      <div className="min-w-0 flex-1">{children}</div>

      {search !== undefined && (
        <div className="relative w-full max-w-sm shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-full border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      )}
    </div>
  );
}
