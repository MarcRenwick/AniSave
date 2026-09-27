import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, Star } from "lucide-react";
import ProductGallery from "../../components/products/ProductGallery";
import PriceTag from "../../components/products/PriceTag";
import ProfitPanels from "../../components/farmer/profit/ProfitPanels";
import { getProduct, getProductProfit } from "../../services/api";
import useScrollReveal from "../../hooks/useScrollReveal";
import { categoryLabel } from "../../utils/categories";
import { money } from "../../utils/profit";

// One of the three prices the profit figures come from.
function Price({ label, value, note }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-900">{value}</dd>
      {note && <dd className="text-xs text-gray-400">{note}</dd>}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{children}</dd>
    </div>
  );
}

export default function FarmerProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  return (
    <div ref={rootRef} className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button type="button" onClick={() => navigate("/farmer/products")} aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 pr-6 text-center text-xl font-semibold">Product Details</h1>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
        {loading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && product && (
          <>
            <div className="grid gap-8 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2">
              <div>
                <ProductGallery key={product._id} product={product} />
                <button
                  type="button"
                  onClick={() => navigate(`/farmer/products/${product._id}/ratings`)}
                  className="mx-auto mt-5 block rounded-md bg-[#2f8f66] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#267a56]"
                >
                  View Ratings
                </button>
              </div>

              <div>
                <h2 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-gray-900">
                  {product.title}
                  {isPreOrder && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Pre-Order
                    </span>
                  )}
                </h2>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                  {product.ratingCount > 0 ? (
                    <span className="flex items-center gap-1.5">
                      {product.rating.toFixed(1)}
                      <span className="flex">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${
                              n <= Math.round(product.rating)
                                ? "fill-amber-400 text-amber-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span>No ratings yet</span>
                  )}
                  <span className="h-4 w-px bg-gray-300" />
                  <span>
                    {product.ratingCount} Rating{product.ratingCount === 1 ? "" : "s"}
                  </span>
                  <span className="h-4 w-px bg-gray-300" />
                  <span>Sold {product.sold}</span>
                </div>

                <div className="mt-5 rounded-md bg-[#2f8f66] px-4 py-2">
                  <PriceTag product={product} tone="light" size="lg" suffix=" per kilo" />
                </div>

                <dl className="mt-6 space-y-5 text-sm">
                  <Row label="Order Fulfillment">
                    <span className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-[#2f8f66]" />
                      Pick-up
                    </span>
                  </Row>
                  <Row label="Category">{categoryLabel(product.category)}</Row>
                  <Row label="Product Type">{isPreOrder ? "For Pre-Order" : "For Sale"}</Row>
                  <Row label="Address">{product.location || "Not set"}</Row>
                  <Row label="Quantity">{product.stock} kilos Available</Row>
                </dl>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="font-semibold text-gray-900">Product Description</p>
              <p className="mt-3 whitespace-pre-line break-words rounded-md border border-gray-300 p-4 text-sm leading-relaxed text-gray-700">
                {product.description || "No description provided yet."}
              </p>
            </div>

            <section className="rounded-2xl bg-white p-6 shadow-sm" data-testid="product-profit">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h2 className="font-semibold text-gray-900">Expense, Income &amp; Profit</h2>
                <p className="text-xs text-gray-500">Only you can see this.</p>
              </div>

              {profitError && <p className="mt-3 text-sm text-red-600">{profitError}</p>}
              {!profit && !profitError && <p className="mt-3 text-sm text-gray-500">Working it out...</p>}

              {profit && (
                <>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <Price
                      label="Expense per kg"
                      value={profit.expensePerKg === null ? "Not set" : money(profit.expensePerKg)}
                    />
                    <Price
                      label="Selling price per kg"
                      value={money(profit.sellingPrice)}
                      note={profit.sellingPrice !== profit.price ? `Flash Sale - usually ${money(profit.price)}` : null}
                    />
                    <Price
                      label="Recommended price per kg"
                      value={profit.recommendation.available ? money(profit.recommendation.pricePerKilo) : "None"}
                      note={
                        profit.recommendation.available
                          ? `${profit.recommendation.municipality} market price`
                          : "No market price recorded"
                      }
                    />
                  </dl>

                  {profit.expensePerKg === null && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <p>This listing has no expense per kg yet, so its profit can&apos;t be worked out.</p>
                      <button
                        type="button"
                        onClick={() => navigate(`/farmer/products/${product._id}/edit`)}
                        className="rounded-md border border-[#2f8f66] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f8f66] hover:bg-green-50"
                      >
                        Add expense
                      </button>
                    </div>
                  )}

                  <div className="mt-4">
                    <ProfitPanels row={profit} />
                  </div>

                  {profit.pendingKg > 0 && (
                    <p className="mt-3 text-xs text-gray-500">
                      {profit.pendingKg} kg {profit.pendingKg === 1 ? "is" : "are"} in orders not picked up
                      yet - counted as sold once they are completed.
                    </p>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
