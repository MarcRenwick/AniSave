import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { EASE, SPRING } from "../../theme/harvest";
import { getFarmerAnalytics, getMyDemand } from "../../services/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import useMediaQuery, { PHONE } from "../../hooks/useMediaQuery";
import Segmented from "./Segmented";
import { COLORS, FONT, METRICS, PERIODS, addDays, buildRange, timeZone, toInputDate } from "./charts/analytics";
import { ChartSkeleton, EmptyState } from "./charts/ChartParts";
import RevenueChart from "./charts/RevenueChart";
import TrendChart from "./charts/TrendChart";
import DemandStockChart from "./charts/DemandStockChart";
import SalesCalendar from "./charts/SalesCalendar";
import ProductShareChart from "./charts/ProductShareChart";
import BestDaysChart from "./charts/BestDaysChart";

// The dashboard's Analytical Demands card: one card, six ways of reading the
// farm's sales, picked with the View switcher. The Period below it applies to
// whichever view is showing. Only completed orders count - a buyer placing one
// doesn't until the farmer has actually fulfilled it - and the figures are
// added up by the server (GET /api/orders/farmer/analytics).
const VIEWS = [
  { key: "revenue", label: "Revenue" },
  // Shortened on the tabs, so all six fit on one row of the card.
  { key: "trend", label: "Trend vs last period", tab: "Trend" },
  { key: "demand", label: "Demand vs Stock" },
  { key: "calendar", label: "Sales calendar" },
  { key: "share", label: "Product share" },
  { key: "bestDays", label: "Best days" },
];

// The view the farmer last looked at comes back next time. Storage can be
// unavailable (a private window, blocked site data), so every use is guarded.
const VIEW_KEY = "anisave_analytics_view";
function savedView() {
  try {
    const stored = localStorage.getItem(VIEW_KEY);
    return VIEWS.some((v) => v.key === stored) ? stored : "revenue";
  } catch {
    return "revenue";
  }
}
function saveView(view) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Not remembered this time; nothing else depends on it.
  }
}

const ACTIVE = "bg-forest-700 text-white shadow-sm";
const DATE_INPUT =
  "rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-[#2e7d32] focus:outline-none focus:ring-1 focus:ring-[#2e7d32]";

export default function DemandChart({ orders }) {
  const [view, setView] = useState(savedView);
  const [metricKey, setMetricKey] = useState("revenue");
  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];
  const [period, setPeriod] = useState("month");
  const [custom, setCustom] = useState(() => {
    const today = new Date();
    return { from: toInputDate(addDays(today, -29)), to: toInputDate(today) };
  });
  const phone = useMediaQuery(PHONE);

  const range = useMemo(() => buildRange(period, custom, new Date()), [period, custom]);
  const rangeKey = `${range.from.getTime()}-${range.to.getTime()}-${range.granularity}`;

  // Sales for the period and the one before it, fetched whenever the period
  // changes. A reply to a period the farmer has since moved on from is dropped.
  const [sales, setSales] = useState({ key: null, data: null, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    getFarmerAnalytics({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      prevFrom: range.prevFrom.toISOString(),
      granularity: range.granularity,
      tz: timeZone(),
    })
      .then(({ data }) => current && setSales({ key: rangeKey, data, error: false }))
      .catch(() => current && setSales({ key: rangeKey, data: null, error: true }));
    return () => {
      current = false;
    };
  }, [range, rangeKey, attempt]);
  const salesReady = sales.key === rangeKey;

  // Stock against buyer interest - fetched the first time that view is opened
  // (and again after a failed attempt, when the farmer asks).
  const [demand, setDemand] = useState({ data: null, error: false });
  const [demandAttempt, setDemandAttempt] = useState(0);
  const demandAsked = useRef(-1);
  useEffect(() => {
    if (view !== "demand" || demandAsked.current === demandAttempt) return;
    demandAsked.current = demandAttempt;
    getMyDemand()
      .then(({ data }) => setDemand({ data, error: false }))
      .catch(() => setDemand({ data: null, error: true }));
  }, [view, demandAttempt]);

  // A completed sale, or stock changing, redraws the charts without a refresh:
  // the same fetches again, with the old figures on screen until they answer.
  useLiveRefresh(["order:changed"], () => setAttempt((n) => n + 1));
  useLiveRefresh(["order:changed", "product:changed"], () => setDemandAttempt((n) => n + 1));

  const chooseView = (key) => {
    setView(key);
    saveView(key);
  };

  const failed = (retry) => (
    <EmptyState title="Couldn't load these figures">
      <button type="button" onClick={retry} className="font-semibold text-[#2e7d32] underline underline-offset-2">
        Try again
      </button>
    </EmptyState>
  );

  let body;
  if (view === "demand") {
    body = demand.error
      ? failed(() => {
          setDemand({ data: null, error: false });
          setDemandAttempt((n) => n + 1);
        })
      : demand.data === null
        ? <ChartSkeleton height={320} />
        : <DemandStockChart demand={demand.data} />;
  } else if (!salesReady) {
    body = <ChartSkeleton stats={view === "revenue"} />;
  } else if (sales.error) {
    body = failed(() => {
      setSales({ key: null, data: null, error: false });
      setAttempt((n) => n + 1);
    });
  } else {
    const props = { data: sales.data, range, period, orders, phone };
    body = {
      revenue: <RevenueChart {...props} metric={metric} />,
      trend: <TrendChart {...props} />,
      calendar: <SalesCalendar {...props} />,
      share: <ProductShareChart {...props} />,
      bestDays: <BestDaysChart {...props} />,
    }[view];
  }

  return (
    <section
      className="harvest-card harvest-chart p-5 sm:p-6"
      style={{ fontFamily: FONT }}
      data-testid="demand-chart"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Analytical Demands</h2>
        <label className="flex items-center gap-2 text-xs font-medium md:hidden" style={{ color: COLORS.muted }}>
          View
          <select
            value={view}
            onChange={(e) => chooseView(e.target.value)}
            className="rounded-lg border border-[#e7dfcf] bg-white px-2.5 py-2 text-sm font-semibold text-gray-900 focus:border-[#2e7d32] focus:outline-none focus:ring-1 focus:ring-[#2e7d32]"
            data-testid="view-select"
          >
            {VIEWS.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        role="tablist"
        aria-label="View"
        className="mt-3 hidden flex-wrap gap-1 rounded-xl border border-[#e7dfcf] bg-[#f6f1e6] p-1 md:flex"
        data-testid="view-tabs"
      >
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            onClick={() => chooseView(v.key)}
            title={v.label}
            className={`relative rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              view === v.key ? "text-white" : "text-[#62594a] hover:bg-white hover:text-gray-900"
            }`}
          >
            {/* The chosen tab's green slides across to whichever is picked next. */}
            {view === v.key && (
              <motion.span layoutId="demand-view-pill" className="absolute inset-0 rounded-lg bg-forest-700 shadow-sm" transition={SPRING} />
            )}
            <span className="relative">{v.tab || v.label}</span>
          </button>
        ))}
      </div>

      {/* What is plotted, then over what. Demand vs Stock has no period: the
          stock is what is on hand now, and buyer interest is counted since
          each product was listed. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-[#faf6ee] p-3" data-testid="chart-filters">
        {view === "demand" ? (
          <p className="text-xs" style={{ color: COLORS.muted }} data-testid="period-note">
            Stock on hand right now, against buyer searches and views since each product was listed - so this view isn&apos;t
            limited to a period.
          </p>
        ) : (
          <>
            <Segmented label="Period" options={PERIODS} value={period} onChange={setPeriod} activeClass={ACTIVE} />
            {view === "revenue" && (
              <>
                <span className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />
                <Segmented label="Show" options={METRICS} value={metricKey} onChange={setMetricKey} activeClass={ACTIVE} />
              </>
            )}
            {period === "custom" && (
              <div className="flex w-full flex-wrap items-center gap-3 text-xs text-gray-600">
                <label className="flex items-center gap-2">
                  From
                  <input
                    type="date"
                    value={custom.from}
                    max={custom.to}
                    onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                    className={DATE_INPUT}
                  />
                </label>
                <label className="flex items-center gap-2">
                  To
                  <input
                    type="date"
                    value={custom.to}
                    min={custom.from}
                    onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                    className={DATE_INPUT}
                  />
                </label>
              </div>
            )}
          </>
        )}
      </div>

      {/* A new view or period starts fresh - no bar or day left open from the last. */}
      <motion.div
        className="mt-5"
        key={`${view}-${rangeKey}`}
        role="tabpanel"
        aria-label={VIEWS.find((v) => v.key === view).label}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        {body}
      </motion.div>
    </section>
  );
}
