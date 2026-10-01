import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowDownUp, Download, Search } from "lucide-react";
import { EASE } from "../../theme/harvest";
import { SERVER_URL } from "../../services/api";
import { money } from "../../utils/profit";
import { amountOf } from "../../utils/units";
import { FONT } from "./charts/analytics";

// The Profit page's "Profit per product": each product's actual sales beside
// its estimate on the stock left, with filters, a search, a sort and a CSV of
// what is shown. Only the look is here - every figure comes from the server
// (server/utils/profit.js), as before.

// A margin under this reads as thin, and the estimate says so in orange.
const THIN_MARGIN = 20;

const perUnit = (unit) => (unit === "tray" ? "tray" : "kg");
const kilos = (n, unit = "kg") => amountOf(n.toLocaleString(), unit);
// "+₱720", "-₱40", "₱0".
const signed = (amount) => (amount > 0 ? `+${money(amount)}` : money(amount));
// Profit over income, as a whole percentage; none without income.
const marginOf = (figures) => (figures.income > 0 ? Math.round((figures.profit / figures.income) * 100) : null);

const hasSales = (row) => row.actual.soldKg > 0;
const hasStock = (row) => row.estimated.quantity > 0;

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "in", label: "In stock", test: (row) => row.stock > 0 },
  { key: "out", label: "Out of stock", test: (row) => row.stock <= 0 },
];

const SORTS = [
  { key: "profit", label: "Highest profit", by: (a, b) => (b.actual.profit ?? 0) - (a.actual.profit ?? 0) || estProfit(b) - estProfit(a) },
  { key: "estimate", label: "Highest est. profit", by: (a, b) => estProfit(b) - estProfit(a) },
  { key: "sold", label: "Most sold", by: (a, b) => b.actual.soldKg - a.actual.soldKg },
  { key: "stock", label: "Most in stock", by: (a, b) => b.stock - a.stock },
  { key: "name", label: "Name (A-Z)", by: (a, b) => a.title.localeCompare(b.title) },
];
const estProfit = (row) => (hasStock(row) ? row.estimated.profit ?? 0 : 0);

// A soft tile per product for one without a photo: its first letters, in one
// of a few tints picked from its name.
const TINTS = [
  "bg-green-100 text-green-800",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-800",
  "bg-orange-100 text-orange-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-800",
];
const tintOf = (title) => TINTS[[...title].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TINTS.length];
const initialsOf = (title) => {
  const words = title.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : title.slice(0, 2)).replace(/^./, (c) => c.toUpperCase());
};

function Avatar({ row }) {
  return row.image ? (
    <img
      src={`${SERVER_URL}${row.image}`}
      alt=""
      className="h-10 w-10 shrink-0 rounded-xl bg-gray-100 object-cover ring-1 ring-gray-200/70"
    />
  ) : (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${tintOf(row.title)}`}>
      {initialsOf(row.title)}
    </span>
  );
}

// "92 kg in stock" (or orange "Out of stock"), "8 kg sold", "₱3,000 cost (₱30/kg)".
function ProductCell({ row }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar row={row} />
      <div className="min-w-0">
        <Link
          to={`/farmer/products/${row._id}`}
          className="block truncate text-sm font-semibold text-gray-900 hover:text-brand hover:underline"
        >
          {row.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] leading-tight text-gray-500">
          {row.stock > 0 ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700" data-testid="stock-pill">
              {kilos(row.stock, row.unit)} in stock
            </span>
          ) : (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700 ring-1 ring-orange-100" data-testid="stock-pill">
              Out of stock
            </span>
          )}
          <span>{kilos(row.actual.soldKg, row.unit)} sold</span>
          <span>
            {money(row.totalExpense)} cost ({money(row.costPerUnit)}/{perUnit(row.unit)})
          </span>
        </div>
      </div>
    </div>
  );
}

// Which price the stock was valued at: the market's, or - with none recorded
// in the farmer's municipality - their own selling price.
function PriceUsed({ row }) {
  const market = row.estimated.basis === "market";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" data-testid="estimate-basis">
      <span className="font-medium text-gray-800">
        {money(row.estimated.pricePerKg)}/{perUnit(row.unit)}
      </span>
      <Tag market={market} />
    </span>
  );
}

const Tag = ({ market }) => (
  <span
    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
      market ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
    }`}
    data-tag={market ? "market" : "yours"}
  >
    {market ? "Market" : "Yours"}
  </span>
);

// A profit, with its margin under it. The estimate's margin turns orange and
// bold when it is thin.
function ProfitFigure({ figures, estimate = false }) {
  const margin = marginOf(figures);
  const loss = figures.profit < 0;
  const thin = estimate && margin !== null && margin < THIN_MARGIN;
  return (
    <div data-testid={estimate ? "est-profit" : "actual-profit"}>
      <p className={`whitespace-nowrap text-[15px] font-bold ${loss ? "text-red-600" : estimate ? "text-blue-900" : "text-brand"}`}>
        {signed(figures.profit)}
      </p>
      {margin !== null && (
        <p
          className={`whitespace-nowrap text-[11px] ${thin ? "font-bold text-orange-600" : "text-gray-400"}`}
          data-testid="margin"
          data-thin={thin || undefined}
        >
          {margin}% margin
        </p>
      )}
    </div>
  );
}

// Where a group of figures can't be worked out: a dashed pill across it.
const EmptyPill = ({ children }) => (
  <span className="inline-block rounded-full border border-dashed border-gray-300 bg-white px-3 py-1 text-[11px] text-gray-500">
    {children}
  </span>
);
const NO_SALES = "No completed sales yet";
const NO_STOCK = "Out of stock · nothing left to estimate";

// The tinted band over each group of columns.
const BAND = {
  actual: "bg-[#eef6ee]",
  estimated: "bg-[#eef2fb]",
};

// The narrow column between the two groups, with a hairline down it.
const Divider = () => (
  <td className="relative p-0" aria-hidden="true">
    <span className="absolute inset-y-3 left-1/2 w-px bg-gray-200/80" />
  </td>
);

// How a row arrives - a moment after the one above it - and how it glides to
// its new place when the list is sorted differently.
const rowMotion = (index) => ({
  layout: "position",
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: Math.min(index, 10) * 0.045, ease: EASE, layout: { duration: 0.45, ease: EASE } },
});

function TableRow({ row, index = 0 }) {
  const { actual, estimated } = row;
  const money$ = "px-3 text-right text-gray-700";
  return (
    <motion.tr {...rowMotion(index)} className="h-20 transition-colors hover:bg-gray-50/60" data-testid="profit-row" data-product={row._id}>
      <td className="max-w-0 py-2 pl-3 pr-3">
        <ProductCell row={row} />
      </td>
      {hasSales(row) ? (
        <>
          <td className={money$}>{money(actual.income)}</td>
          <td className={money$}>{money(actual.expense)}</td>
          <td className="px-3 pr-5 text-right">
            <ProfitFigure figures={actual} />
          </td>
        </>
      ) : (
        <td colSpan={3} className="px-3 text-center">
          <EmptyPill>{NO_SALES}</EmptyPill>
        </td>
      )}
      <Divider />
      {hasStock(row) ? (
        <>
          <td className="px-3 text-left">
            <PriceUsed row={row} />
          </td>
          <td className={money$}>{money(estimated.income)}</td>
          <td className={money$}>{money(estimated.expense)}</td>
          <td className="px-3 pr-4 text-right">
            <ProfitFigure figures={estimated} estimate />
          </td>
        </>
      ) : (
        <td colSpan={4} className="px-3 text-center">
          <EmptyPill>{NO_STOCK}</EmptyPill>
        </td>
      )}
    </motion.tr>
  );
}

// The same on a phone or tablet: the product, then its two groups.
function MobileRow({ row, index = 0 }) {
  const { actual, estimated } = row;
  const group = (title, dot, band, figures, estimate, empty, tag) => (
    <div className={`rounded-xl px-3 py-2.5 text-xs ${band}`}>
      <p className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-700">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {title}
        </span>
        {figures && tag}
      </p>
      {figures ? (
        <div className="mt-1.5 grid grid-cols-3 gap-2 tabular-nums">
          <p className="text-gray-500">
            Income <span className="block text-sm font-medium text-gray-800">{money(figures.income)}</span>
          </p>
          <p className="text-gray-500">
            Expense <span className="block text-sm font-medium text-gray-800">{money(figures.expense)}</span>
          </p>
          <div className="text-gray-500">
            {estimate ? "Est. profit" : "Profit"}
            <ProfitFigure figures={figures} estimate={estimate} />
          </div>
        </div>
      ) : (
        <div className="mt-1.5">
          <EmptyPill>{empty}</EmptyPill>
        </div>
      )}
    </div>
  );
  return (
    <motion.li {...rowMotion(index)} className="space-y-2.5 px-4 py-4 sm:px-5" data-testid="profit-row" data-product={row._id}>
      <ProductCell row={row} />
      {group("Actual sales", "bg-brand", BAND.actual, hasSales(row) ? actual : null, false, NO_SALES)}
      {group(
        "Estimated on stock",
        "bg-blue-600",
        BAND.estimated,
        hasStock(row) ? estimated : null,
        true,
        NO_STOCK,
        <PriceUsed row={row} />
      )}
    </motion.li>
  );
}

// A spreadsheet of the rows shown, as they are shown.
function exportCsv(rows) {
  const header = [
    "Product", "Unit", "In stock", "Sold", "Total expense", "Cost per unit",
    "Actual income", "Actual expense", "Actual profit", "Actual margin %",
    "Price used", "Price basis", "Est. income", "Est. expense", "Est. profit", "Est. margin %",
  ];
  const lines = rows.map((row) => {
    const { actual, estimated } = row;
    const sold = hasSales(row);
    const stocked = hasStock(row);
    return [
      row.title, perUnit(row.unit), row.stock, actual.soldKg, row.totalExpense, row.costPerUnit,
      sold ? actual.income : "", sold ? actual.expense : "", sold ? actual.profit : "", sold ? marginOf(actual) ?? "" : "",
      stocked ? estimated.pricePerKg : "", stocked ? (estimated.basis === "market" ? "Market" : "Yours") : "",
      stocked ? estimated.income : "", stocked ? estimated.expense : "", stocked ? estimated.profit : "", stocked ? marginOf(estimated) ?? "" : "",
    ];
  });
  const cell = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...lines].map((line) => line.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `anisave-profit-per-product-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ProfitTable({ rows }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("profit");

  const costed = useMemo(() => rows.filter((row) => row.costPerUnit !== null), [rows]);
  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.key === filter).test;
    const words = query.trim().toLowerCase();
    return costed
      .filter((row) => test(row) && (!words || row.title.toLowerCase().includes(words)))
      .sort(SORTS.find((s) => s.key === sort).by);
  }, [costed, filter, query, sort]);

  return (
    <section
      className="overflow-hidden rounded-[20px] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)]"
      style={{ fontFamily: FONT }}
      data-testid="profit-products"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 pb-4 pt-5 sm:px-6 xl:flex-nowrap">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900">Profit per product</h2>
          <p className="text-xs text-gray-500">
            {costed.length} product{costed.length === 1 ? "" : "s"} with a total expense set · actual sales vs. what&apos;s
            still in stock
          </p>
        </div>

        {costed.length > 0 && (
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:shrink-0 xl:flex-nowrap" data-testid="profit-toolbar">
            <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-semibold max-sm:w-full" role="tablist" aria-label="Show">
              {FILTERS.map((f) => {
                const count = costed.filter(f.test).length;
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f.key)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 transition max-sm:flex-1 ${
                      active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                    }`}
                    data-filter={f.key}
                  >
                    {f.label} <span className={active ? "text-gray-500" : "text-gray-400"}>{count}</span>
                  </button>
                );
              })}
            </div>
            <label className="relative flex-1 sm:w-48 sm:flex-none">
              <span className="sr-only">Search product</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search product"
                className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-green-100"
                data-testid="profit-search"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Sort</span>
              <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-9 cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-xs font-semibold text-gray-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-green-100"
                data-testid="profit-sort"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {costed.length === 0 ? (
        <p className="px-4 pb-5 text-sm text-gray-500 sm:px-6">
          {rows.length === 0
            ? "No products yet. Add one from My Products to see its expense and profit here."
            : "None of your products has a total expense yet - add one below to see its figures."}
        </p>
      ) : (
        <>
          {shown.length === 0 ? (
            <p className="border-t border-gray-100 px-6 py-10 text-center text-sm text-gray-500" data-testid="profit-none-shown">
              No products match{query.trim() ? ` "${query.trim()}"` : ""}.
            </p>
          ) : (
            <>
              <div className="px-3 max-xl:hidden">
                <table className="w-full table-fixed text-left text-[13px] tabular-nums" data-testid="profit-table">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[8.5%]" />
                    <col className="w-[8.5%]" />
                    <col className="w-[10%]" />
                    <col className="w-[14px]" />
                    <col className="w-[13%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[13%]" />
                  </colgroup>
                  <thead className="text-[11px] text-gray-500">
                    <tr>
                      <th className="p-0" />
                      <th colSpan={3} className="p-0 pt-1">
                        <p className={`whitespace-nowrap rounded-t-xl px-3 pb-1 pt-2.5 text-left ${BAND.actual}`} data-testid="band-actual">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-dark">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                            Actual sales
                          </span>
                          <span className="font-normal text-gray-500"> · completed orders</span>
                        </p>
                      </th>
                      <th className="p-0" />
                      <th colSpan={4} className="p-0 pt-1">
                        <p className={`whitespace-nowrap rounded-t-xl px-3 pb-1 pt-2.5 text-left ${BAND.estimated}`} data-testid="band-estimated">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            Estimated on stock
                          </span>
                          <span className="font-normal text-gray-500"> · if the remaining kilos sell</span>
                        </p>
                      </th>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2.5 pl-3 pt-1 text-left font-semibold text-gray-600">Product</th>
                      <th className={`px-3 py-2 text-right font-medium ${BAND.actual}`}>Income</th>
                      <th className={`px-3 py-2 text-right font-medium ${BAND.actual}`}>Expense</th>
                      <th className={`px-3 py-2 pr-5 text-right font-medium ${BAND.actual}`}>Profit</th>
                      <th className="p-0" />
                      <th className={`px-3 py-2 text-left font-medium ${BAND.estimated}`}>Price used</th>
                      <th className={`px-3 py-2 text-right font-medium ${BAND.estimated}`}>Income</th>
                      <th className={`px-3 py-2 text-right font-medium ${BAND.estimated}`}>Expense</th>
                      <th className={`px-3 py-2 pr-4 text-right font-medium ${BAND.estimated}`}>Est. profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shown.map((row, i) => (
                      <TableRow key={row._id} row={row} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-gray-100 border-t border-gray-100 xl:hidden" data-testid="profit-cards">
                {shown.map((row, i) => (
                  <MobileRow key={row._id} row={row} index={i} />
                ))}
              </ul>
            </>
          )}

          <div
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-[11px] text-gray-500 sm:px-6"
            data-testid="profit-legend"
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="flex items-center gap-1.5">
                <Tag market /> recommended price in your municipality
              </span>
              <span className="flex items-center gap-1.5">
                <Tag market={false} /> your own selling price (no market price recorded)
              </span>
              <span>
                <span className="font-bold text-orange-600">Orange margin</span> - below {THIN_MARGIN}%
              </span>
            </div>
            <button
              type="button"
              onClick={() => exportCsv(shown)}
              disabled={shown.length === 0}
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline disabled:opacity-50"
              data-testid="export-csv"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </>
      )}
    </section>
  );
}
