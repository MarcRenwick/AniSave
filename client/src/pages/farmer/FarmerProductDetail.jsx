import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Lock, Pencil, Star } from "lucide-react";
import ProductGallery from "../../components/products/ProductGallery";
import { getProduct, getProductProfit } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import useScrollReveal from "../../hooks/useScrollReveal";
import { categoryLabel } from "../../utils/categories";
import { discountPercent, effectivePrice, onFlashSale } from "../../utils/pricing";
import { money, productFinancials } from "../../utils/profit";
import { amountOf, unitOf, unitWord } from "../../utils/units";
import useHarvestTheme from "../../theme/useHarvestTheme";
import { CountUp, SproutLoader } from "../../components/motion";
import { CATEGORY_COLORS, EASE } from "../../theme/harvest";

const CARD = "harvest-card p-6";
// "12 kg", or "3 trays" for eggs.
const kilos = (n, unit = "kg") => amountOf(n.toLocaleString(), unit);

function Chip({ tone = "green", children }) {
  const look = {
    green: "bg-green-50 text-brand-dark ring-green-100",
    grey: "bg-gray-100 text-gray-700 ring-gray-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
  }[tone];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${look}`}>{children}</span>;
}

// A small bordered box: a grey label over a bold value.
function Tile({ label, children, wide = false }) {
  return (
    <div className={`rounded-xl border border-gray-200 px-3.5 py-2.5 ${wide ? "col-span-2" : ""}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">{children}</p>
    </div>
  );
}

// One label-left, value-right line of the Per kilo (or Per tray) list.
function PerKilo({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
      <dt className="text-gray-600">{label}</dt>
      <dd className="text-right font-semibold text-gray-900">{children}</dd>
    </div>
  );
}

// Where every listed kilo is, as one bar: sold (completed orders), then the
// stock - ordered but not completed yet, and not ordered yet.
function StockBar({ stock, unit }) {
  const { soldKg, pendingKg, inStockKg, listedKg } = stock;
  const parts = [
    { key: "sold", label: "Sold", kg: soldKg, className: "bg-brand-dark" },
    { key: "pending", label: "Ordered, not done yet", kg: pendingKg, className: "bg-amber-400" },
    { key: "stock", label: "Not ordered yet", kg: inStockKg, className: "bg-green-200" },
  ];
  return (
    <div data-testid="stock-bar">
      <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
        {listedKg > 0 &&
          parts.map((p) =>
            p.kg > 0 ? (
              <div key={p.key} data-part={p.key} className={`h-full ${p.className}`} style={{ width: `${(p.kg / listedKg) * 100}%` }} />
            ) : null
          )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${p.className}`} />
            {p.label} {kilos(p.kg, unit)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// The farmer's own figures for this listing. Only they see it.
function FinancialsPanel({ fin, productTitle, city, editPath }) {
  const { actual, remaining, unit } = fin;
  const loss = actual.profit !== null && actual.profit < 0;
  const sub = (text) => <p className="text-[11px] opacity-80">{text}</p>;

  return (
    <>
      {/* Only the profit card is solid green; a loss turns it to a warning. */}
      <div
        data-testid="profit-card"
        className={`harvest-grain-dark mt-4 overflow-hidden rounded-2xl p-5 text-white ${
          loss ? "bg-tomato-600 shadow-glow-tomato" : "bg-[linear-gradient(145deg,#173d24,#1f5130_45%,#2e7d32)] shadow-glow-forest"
        }`}
      >
        <p className="text-sm font-medium opacity-90">Profit from completed sales</p>
        {actual.profit === null ? (
          <p className="mt-1 text-sm font-semibold">Add your total expense to see it</p>
        ) : (
          <CountUp value={actual.profit} format={money} on="mount" className="mt-1 block font-display text-4xl font-semibold tracking-tight" />
        )}
        <p className="mt-1 text-xs opacity-90">
          {actual.soldKg > 0
            ? `${kilos(actual.soldKg, unit)} sold · ${actual.orders} completed order${actual.orders === 1 ? "" : "s"}`
            : "No completed sales yet"}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/15 px-3 py-2.5">
            <p className="text-xs opacity-90">Income</p>
            <p className="text-lg font-bold">{money(actual.income)}</p>
            {sub("What buyers paid")}
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2.5">
            <p className="text-xs opacity-90">Expense</p>
            <p className="text-lg font-bold">{actual.expense === null ? "—" : money(actual.expense)}</p>
            {sub(fin.hasCost ? `${kilos(actual.soldKg, unit)} × ${money(fin.costPerUnit)}` : "No total expense yet")}
          </div>
        </div>
      </div>

      {fin.totalExpense !== null && (
        <dl className="mt-6" data-testid="total-expense">
          <PerKilo label={`Total expense (${kilos(fin.initialQuantity ?? 0, unit)} listed)`}>{money(fin.totalExpense)}</PerKilo>
        </dl>
      )}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-500">Per {unitWord(unit)}</p>
      <dl className="mt-1 divide-y divide-gray-100" data-testid="per-kilo">
        <PerKilo label="Your cost">
          {fin.hasCost ? (
            money(fin.costPerUnit)
          ) : (
            <Link to={editPath} className="text-amber-700 underline underline-offset-2 hover:text-amber-800">
              Not set - add it
            </Link>
          )}
        </PerKilo>
        <PerKilo label="Selling price">
          {money(fin.sellingPrice)}
          {fin.onSale && <span className="ml-1 text-xs font-normal text-gray-500">(usually {money(fin.regularPrice)})</span>}
        </PerKilo>
        <PerKilo label="Margin">
          {fin.margin === null ? (
            <span className="font-normal text-gray-400">—</span>
          ) : (
            <span className={fin.margin < 0 ? "text-tomato-700" : "text-brand"}>
              {fin.margin > 0 ? "+" : ""}
              {money(fin.margin)}
            </span>
          )}
        </PerKilo>
        <PerKilo label={`Market price (${city})`}>
          {fin.marketPrice === null ? <span className="font-normal text-gray-400">Not recorded</span> : money(fin.marketPrice)}
        </PerKilo>
      </dl>

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stock</p>
        <p className="text-xs text-gray-500">{kilos(fin.stock.listedKg, unit)} listed</p>
      </div>
      <div className="mt-2">
        <StockBar stock={fin.stock} unit={unit} />
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-4" data-testid="remaining-stock">
        <p className="text-sm font-semibold text-gray-900">Remaining stock ({kilos(fin.stock.onHandKg, unit)})</p>
        <dl className="mt-2 space-y-1.5 text-sm">
          {fin.hasCost && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-gray-600">
                Capital in stock{" "}
                <span className="text-xs text-gray-400">
                  {kilos(fin.stock.onHandKg, unit)} × {money(fin.costPerUnit)}
                </span>
              </dt>
              <dd className="font-semibold text-gray-900">{money(remaining.capital)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-gray-600">
              {remaining.basis === "market" ? "If sold at market price" : "If sold at your price"}{" "}
              <span className="text-xs text-gray-400">
                {kilos(fin.stock.onHandKg, unit)} × {money(remaining.pricePerKg)}
              </span>
            </dt>
            <dd className="font-semibold text-gray-900">{money(remaining.income)}</dd>
          </div>
          {remaining.profit !== null && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-gray-600">Estimated profit</dt>
              <dd className={`font-bold ${remaining.profit < 0 ? "text-tomato-700" : "text-brand"}`}>{money(remaining.profit)}</dd>
            </div>
          )}
        </dl>
        {remaining.basis === "selling" && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            No market price is recorded for {productTitle} in {city} yet, so this uses your own selling price.
          </p>
        )}
        {!fin.hasCost && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Add your total expense to see what this stock cost you and what it would make.
          </p>
        )}
      </div>
    </>
  );
}

export default function FarmerProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  useHarvestTheme();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Expense, income and profit - the owner's alone, fetched on their own so
  // the listing still shows if they can't be worked out.
  const [profit, setProfit] = useState(null);
  const [profitError, setProfitError] = useState("");
  const rootRef = useRef(null);
  useScrollReveal(rootRef);

  useEffect(() => {
    getProduct(id)
      .then(({ data }) => setProduct(data))
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getProductProfit(id)
      .then(({ data }) => setProfit(data))
      .catch(() => setProfitError("Could not work out this product's expense and profit."));
  }, [id]);

  const isPreOrder = product?.productType === "preorder";
  const fin = profit ? productFinancials(profit) : null;
  const city = fin?.municipality || user?.address?.city || "your municipality";
  const editPath = `/farmer/products/${id}/edit`;

  return (
    <div ref={rootRef} className="harvest-field min-h-screen">
      <div className="harvest-grain-dark sticky top-0 z-20 flex items-center gap-3 bg-[linear-gradient(110deg,#0f2418,#1f5130)] px-4 py-3 text-cream shadow-[0_10px_30px_-20px_rgb(0_0_0/0.6)] sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/farmer/products")}
          aria-label="Back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream/10 transition-colors hover:bg-cream/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">Product Details</h1>
        <Link
          to={editPath}
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gold-400 px-4 text-sm font-bold text-night shadow-glow-gold transition-colors hover:bg-gold-300"
        >
          <Pencil className="h-4 w-4" />
          Edit product
        </Link>
      </div>

      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        {loading && <SproutLoader label="Loading..." />}
        {error && <p className="text-sm text-tomato-700">{error}</p>}

        {!loading && !error && product && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-6">
              <div
                className={`relative grid grid-cols-1 gap-6 overflow-hidden md:grid-cols-2 xl:grid-cols-[minmax(0,22.5rem)_minmax(0,1fr)] ${CARD}`}
                data-testid="product-card"
                style={{ "--cat": CATEGORY_COLORS[product.category] || CATEGORY_COLORS.vegetable }}
              >
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,var(--cat),transparent_85%)]" data-testid="category-accent" />
                <ProductGallery key={product._id} product={product} variant="farmer" />

                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    <Chip>
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: "var(--cat)" }} />
                      {categoryLabel(product.category)}
                    </Chip>
                    {isPreOrder ? <Chip tone="amber">For Pre-Order</Chip> : <Chip tone="grey">For Sale</Chip>}
                  </div>
                  <h2 className="mt-2 break-words text-4xl font-semibold tracking-tight text-gray-900">{product.title}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    {product.ratingCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {product.rating.toFixed(1)} ({product.ratingCount} rating{product.ratingCount === 1 ? "" : "s"})
                      </span>
                    ) : (
                      <span>No ratings yet</span>
                    )}
                    <span className="h-3.5 w-px bg-gray-300" aria-hidden="true" />
                    <span>{product.sold} sold</span>
                  </p>

                  <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-2xl border border-gold-200 bg-[linear-gradient(120deg,#fdf6e3,#fffdf8_60%)] px-4 py-3" data-testid="price-block">
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-[linear-gradient(90deg,transparent,rgb(247_219_143/0.7),transparent)]"
                      initial={{ x: "0%" }}
                      animate={{ x: "520%" }}
                      transition={{ duration: 1.4, delay: 0.5, ease: EASE }}
                    />
                    <p className="relative flex flex-wrap items-baseline gap-x-2">
                      <span className="font-display text-4xl font-semibold text-brand">{money(effectivePrice(product))}</span>
                      <span className="text-sm text-gray-600">per {unitWord(unitOf(product))}</span>
                      {onFlashSale(product) && <span className="text-sm text-gray-400 line-through">{money(product.price)}</span>}
                    </p>
                    {onFlashSale(product) && (
                      <span className="relative rounded-full bg-gold-400 px-2.5 py-1 text-xs font-bold text-night">
                        Flash sale −{discountPercent(product)}%
                      </span>
                    )}
                    {fin?.marketPrice != null && (
                      <span className="relative w-full text-xs text-gray-600" data-testid="recommended-price">
                        Recommended in {city}:{" "}
                        <span className="font-semibold text-gray-900">
                          {money(fin.marketPrice)} per {unitWord(unitOf(product))}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Tile label="Order fulfillment">Pick-up</Tile>
                    <Tile label="Available">{kilos(product.stock, unitOf(product))}</Tile>
                    <Tile label="Pick-up address" wide>
                      {product.location || "Not set"}
                    </Tile>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/farmer/products/${product._id}/ratings`)}
                    className="mt-4 h-11 rounded-full border border-brand px-5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                  >
                    View ratings
                  </button>
                </div>
              </div>

              <div className={CARD}>
                <h2 className="font-semibold text-gray-900">Product description</h2>
                <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-gray-600">
                  {product.description || "No description provided yet."}
                </p>
              </div>
            </div>

            <section className={`${CARD} lg:sticky lg:top-24`} data-testid="product-profit">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-gray-900">Expense, Income &amp; Profit</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  <Lock className="h-3 w-3" />
                  Only you
                </span>
              </div>

              {profitError && <p className="mt-3 text-sm text-tomato-700">{profitError}</p>}
              {!profit && !profitError && <SproutLoader compact label="Working it out..." className="mt-3" />}
              {fin && <FinancialsPanel fin={fin} productTitle={product.title} city={city} editPath={editPath} />}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
