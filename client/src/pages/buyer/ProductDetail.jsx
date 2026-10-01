import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useNavigate, useNavigationType, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Package, Star, ShoppingBasket } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import AddToCartModal from "../../components/buyer/AddToCartModal";
import CheckoutModal from "../../components/buyer/CheckoutModal";
import ProductGallery from "../../components/products/ProductGallery";
import PriceTag from "../../components/products/PriceTag";
import Avatar from "../../components/Avatar";
import { BlockSkeleton } from "../../components/buyer/BuyerVisuals";
import { categoryPhoto } from "../../utils/categoryPhotos";
import { categoryLabel } from "../../utils/categories";
import { EASE } from "../../theme/harvest";
import MessageFarmerButton from "../../components/chat/MessageFarmerButton";
import { getProduct, getFarmerProfile } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { activeAgo, timeAgo } from "../../utils/activity";
import { effectivePrice } from "../../utils/pricing";
import { amountOf, unitOf, unitWord, unitWords } from "../../utils/units";

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="text-gray-500">{label}</span>
      <span className="font-display text-lg font-semibold text-forest-700">{value}</span>
    </div>
  );
}

// The page's panels: paper on the cream, rising in one after another.
const panel = "rounded-[1.75rem] bg-paper shadow-soft ring-1 ring-gray-200";
const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: EASE },
});

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { state } = useLocation();
  const { user } = useAuth();
  const { addToCart } = useCart();

  // Whether this is the buyer opening the listing, which counts towards what
  // buyers are looking for, or the same page being returned to.
  //
  // Two things have to be true. It has to have been reached from somewhere
  // buyers browse - the marketplace sections or a farmer's shop - which is
  // what `fromBrowse` says. And it has to be a new step forward: going back
  // here from the ratings page or the checkout replays the very same history
  // entry, `fromBrowse` and all, and the browser calls that a POP.
  const isFreshOpen = navigationType === "PUSH" && state?.fromBrowse === true;

  const [product, setProduct] = useState(null);
  const [farmerStats, setFarmerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyMessage, setBuyMessage] = useState("");
  const [showAddToCart, setShowAddToCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProduct(id, { opened: isFreshOpen })
      .then(({ data }) => {
        setProduct(data);
        return data.farmer?._id ? getFarmerProfile(data.farmer._id) : null;
      })
      .then((farmerRes) => {
        if (farmerRes) setFarmerStats(farmerRes.data);
      })
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));
    // Both hold still for as long as this history entry is on screen, so this
    // fetches once per listing opened and not once per render.
  }, [id, isFreshOpen]);

  const handleConfirmAddToCart = (qty) => {
    addToCart(product, qty);
    setShowAddToCart(false);
    setBuyMessage(`Added ${amountOf(qty, unitOf(product))} to cart!`);
  };

  const isPreOrder = product?.productType === "preorder";
  const soldOut = !isPreOrder && product?.stock === 0;

  const handleProceedToCheckout = (qty) => {
    setShowCheckout(false);
    navigate("/buyer/checkout", {
      state: {
        items: [
          {
            productId: product._id,
            title: product.title,
            price: effectivePrice(product),
            originalPrice: product.price,
            image: product.image,
            farmerId: product.farmer?._id,
            farmerName: product.farmer?.farmName || product.farmer?.name || "Unknown Farmer",
            location: product.location || product.farmer?.location || "Address not set",
            quantity: qty,
            preorder: isPreOrder,
          },
        ],
        fromCart: false,
      },
    });
  };

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="group flex w-fit items-center gap-2 rounded-full border border-gray-300 bg-paper px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Home
        </button>
      </BuyerTopBar>

      <div className="p-4 sm:p-8">
        {loading && (
          <div className="grid gap-6 md:grid-cols-2">
            <BlockSkeleton className="h-96" />
            <BlockSkeleton className="h-96" />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && product && (
          <motion.div {...rise()} className={`grid gap-6 p-4 sm:p-6 md:grid-cols-2 md:gap-10 ${panel}`}>
            <div>
              {/* The photo the add-to-cart flight leaves from (cartFlight.js). */}
              <div data-fly-source>
                <ProductGallery key={product._id} product={product} />
              </div>

              <Link
                to={`/buyer/products/${product._id}/ratings`}
                className="mx-auto mt-4 block w-fit rounded-full border-2 border-brand px-6 py-2 text-sm font-semibold text-brand transition-colors hover:bg-forest-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 active:scale-95"
              >
                View Ratings
              </Link>

              <AnimatePresence>
                {buyMessage && (
                  <motion.div
                    key={buyMessage}
                    role="status"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    className="mt-4 rounded-xl bg-forest-50 px-3.5 py-2.5 text-sm font-medium text-forest-800 ring-1 ring-forest-100"
                  >
                    {buyMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {user?.role === "buyer" ? (
                <div className="mt-4 flex gap-3">
                  {/* Pre-orders are placed one listing at a time, straight from here -
                      the cart checks out against live stock. */}
                  <button
                    type="button"
                    onClick={() => setShowAddToCart(true)}
                    disabled={product.stock === 0 || isPreOrder}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-brand py-3 text-sm font-semibold text-brand transition-colors hover:bg-forest-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 disabled:opacity-60"
                  >
                    <ShoppingBasket className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckout(true)}
                    disabled={soldOut}
                    className={`flex-1 rounded-full py-3 text-sm font-semibold shadow-[0_10px_24px_-12px_rgb(31_81_48/0.8)] transition-colors focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60 ${
                      isPreOrder
                        ? "bg-gold-400 text-night hover:bg-gold-300 focus-visible:ring-gold-300/50"
                        : "bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand/30"
                    }`}
                  >
                    {isPreOrder ? "Pre-Order" : soldOut ? "Out of Stock" : "Buy Now"}
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="mt-4 block w-full rounded-full bg-tomato-600 py-3 text-center text-sm font-semibold text-white shadow-glow-tomato transition-colors hover:bg-tomato-700"
                >
                  Log in as a buyer to order
                </Link>
              )}
            </div>

            <div>
              {/* The listing's category, with a photo from the market. */}
              <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-forest-50 py-1 pl-1 pr-3 text-xs font-bold uppercase tracking-[0.14em] text-forest-800 ring-1 ring-forest-100" data-testid="category-ribbon">
                <img src={categoryPhoto(product.category).small} alt="" className="h-6 w-6 rounded-full object-cover" />
                {categoryLabel(product.category)}
              </span>
              <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl">
                {product.title}
                {isPreOrder && (
                  <span className="rounded-full bg-gold-200 px-2.5 py-0.5 font-body text-xs font-bold text-soil-700">
                    Pre-Order
                  </span>
                )}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <Star
                  className={`h-4 w-4 ${product.ratingCount > 0 ? "fill-gold-400 text-gold-500" : "text-gray-300"}`}
                />
                {product.ratingCount > 0
                  ? `${product.rating.toFixed(1)} (${product.ratingCount} rating${product.ratingCount === 1 ? "" : "s"})`
                  : "No ratings yet"}{" "}
                · Sold {product.sold || 0}
              </p>

              {/* The price on deep green, with a sweep of light across it. */}
              <div className="relative mt-5 overflow-hidden rounded-2xl bg-[linear-gradient(110deg,#173d24,#2e7d32)] px-5 py-3.5 shadow-soft" data-testid="price-band">
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-cream/25 to-transparent motion-safe:animate-[harvest-price-sweep_3.6s_var(--ease-harvest)_1s_infinite]" />
                <PriceTag product={product} tone="light" size="lg" suffix={` per ${unitWord(unitOf(product))}`} />
              </div>

              <dl className="mt-5 divide-y divide-gray-200 rounded-2xl bg-cream/70 px-4 text-sm ring-1 ring-gray-200 [&>div]:py-3">
                <div>
                  <dt className="text-gray-500">Sold by</dt>
                  <dd className="font-medium text-gray-900">
                    {product.farmer?._id ? (
                      <Link to={`/buyer/farmers/${product.farmer._id}`} className="hover:underline">
                        {product.farmer?.farmName || product.farmer?.name || "Unknown farmer"}
                      </Link>
                    ) : (
                      product.farmer?.farmName || product.farmer?.name || "Unknown farmer"
                    )}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-clay-500" />
                  <dt className="text-gray-500">Pick up</dt>
                  <dd className="font-medium text-gray-900">Ready for pickup</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Category</dt>
                  <dd className="font-medium capitalize text-gray-900">{product.category}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Address</dt>
                  <dd className="font-medium text-gray-900">
                    {product.location || product.farmer?.location || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Available Stock</dt>
                  <dd className="font-medium text-gray-900">{product.stock} {unitWords(unitOf(product))}</dd>
                </div>
              </dl>
            </div>
          </motion.div>
        )}

        {!loading && !error && product && (
          <motion.div {...rise(0.12)} className={`mt-6 overflow-hidden ${panel}`}>
            <div className="bg-[linear-gradient(110deg,#0f2418,#1f5130)] px-6 py-3.5 font-display text-lg font-semibold text-cream">
              Product Description
            </div>
            <p className="whitespace-pre-line break-words p-6 text-sm leading-relaxed text-gray-700">
              {product.description || "No description provided yet."}
            </p>
          </motion.div>
        )}

        {!loading && !error && product && farmerStats && (
          <motion.div {...rise(0.22)} className={`mt-6 flex flex-wrap items-center justify-between gap-5 p-5 sm:gap-8 sm:p-7 ${panel}`}>
            <div className="flex items-center gap-5">
              <Avatar
                src={farmerStats.avatar}
                alt={farmerStats.farmName || farmerStats.name}
                className="h-20 w-20 rounded-full bg-forest-100 text-brand ring-4 ring-forest-50"
                iconClass="h-10 w-10"
              />
              <div>
                <p className="font-display text-2xl font-semibold text-gray-900">
                  {farmerStats.farmName || farmerStats.name}
                </p>
                {activeAgo(farmerStats.lastActiveAt) && (
                  <p className="text-sm text-gray-500">{activeAgo(farmerStats.lastActiveAt)}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link
                    to={`/buyer/farmers/${product.farmer._id}`}
                    className="inline-block rounded-full border border-brand px-4 py-1.5 text-sm font-semibold text-brand transition-colors duration-150 hover:bg-forest-50 active:scale-95"
                  >
                    View Seller
                  </Link>
                  <MessageFarmerButton
                    farmerId={product.farmer._id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:scale-95 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-y-3 text-sm sm:w-auto sm:grid-cols-2 sm:gap-x-12">
              <Stat label="Ratings" value={farmerStats.ratingCount} />
              <Stat label="Joined" value={timeAgo(farmerStats.createdAt)} />
              <Stat label="Products" value={farmerStats.productCount} />
            </div>
          </motion.div>
        )}
      </div>

      {showAddToCart && product && (
        <AddToCartModal
          product={product}
          onClose={() => setShowAddToCart(false)}
          onConfirm={handleConfirmAddToCart}
        />
      )}

      {showCheckout && product && (
        <CheckoutModal
          product={product}
          preorder={isPreOrder}
          onClose={() => setShowCheckout(false)}
          onConfirm={handleProceedToCheckout}
        />
      )}
    </BuyerLayout>
  );
}
