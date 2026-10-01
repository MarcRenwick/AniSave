import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { BadgeCheck, Ban, Flag, MapPin, MoreVertical, Phone } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import Avatar from "../../components/Avatar";
import Modal from "../../components/Modal";
import BlockUserModal from "../../components/buyer/BlockUserModal";
import BlockResultDialog from "../../components/buyer/BlockResultDialog";
import MessageFarmerButton from "../../components/chat/MessageFarmerButton";
import PriceTag from "../../components/products/PriceTag";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  getFarmerProfile,
  getAllProducts,
  blockUser,
  unblockUser,
  SERVER_URL,
} from "../../services/api";
import { activeAgo, timeAgo } from "../../utils/activity";
import { onFlashSale, discountPercent } from "../../utils/pricing";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import { formatDistance } from "../../utils/address";
import { forgetReportSent, reportJustSent } from "../../utils/reports";
import { usePageSettled, useSmoothNavigate } from "../../utils/pageTransition";
import { categoryFilters, categoryLabel } from "../../utils/categories";
import { categoryPhoto } from "../../utils/categoryPhotos";
import { BUYER_PHOTOS } from "../../utils/buyerPhotos";
import { BlockSkeleton, PhotoEmptyState } from "../../components/buyer/BuyerVisuals";
import { EASE } from "../../theme/harvest";
import { unitOf, unitWord } from "../../utils/units";

const baseTabs = [
  { key: "home", label: "Home" },
  { key: "all", label: "All Products" },
];

function Stat({ label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-cream/75">{label}:</span>
      <span className="font-semibold text-gold-300">{value}</span>
    </div>
  );
}

// The shop's listings. Changing what's shown (a category, All) moves each
// card to its new place and fades the rest out, rather than swapping the grid.
function ProductGrid({ products, empty }) {
  const reduced = useReducedMotion();
  if (products.length === 0) {
    return (
      <PhotoEmptyState photo={BUYER_PHOTOS.marketLane} title={empty} />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4" data-testid="shop-grid">
      <AnimatePresence initial={false} mode="popLayout">
        {products.map((product) => (
          <motion.div
            key={product._id}
            layout={!reduced}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
            transition={{ layout: { type: "spring", stiffness: 260, damping: 30 }, duration: 0.35, ease: EASE }}
            className="grid"
          >
            <Link
              to={`/buyer/products/${product._id}`}
              // A shop page is a place buyers browse, so opening a listing from
              // here counts as interest in the same way the marketplace does.
              state={{ fromBrowse: true }}
              className="group overflow-hidden rounded-[1.4rem] bg-paper shadow-soft ring-1 ring-gray-200 transition-[translate,box-shadow] duration-300 ease-harvest hover:-translate-y-1 hover:shadow-lift active:scale-[0.98]"
            >
              <div className="relative flex h-36 w-full items-center justify-center overflow-hidden bg-sand text-gray-300">
                {product.image ? (
                  <img
                    src={`${SERVER_URL}${product.image}`}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-500 ease-harvest group-hover:scale-[1.07]"
                  />
                ) : (
                  <>
                    <img
                      src={categoryPhoto(product.category).small}
                      srcSet={categoryPhoto(product.category).srcSet}
                      sizes="16rem"
                      alt={categoryPhoto(product.category).alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-harvest group-hover:scale-[1.07]"
                    />
                    <span className="absolute bottom-2 left-2 rounded-full bg-night/60 px-2 py-0.5 text-[10px] font-semibold text-cream backdrop-blur-sm">
                      No photo yet
                    </span>
                  </>
                )}
                {product.productType === "preorder" ? (
                  <span className="absolute left-2 top-2 rounded-full bg-gold-300 px-2 py-0.5 text-[10px] font-bold text-night">
                    Pre-order
                  </span>
                ) : (
                  product.stock === 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-night/75 px-2 py-0.5 text-[10px] font-semibold text-cream">
                      Out of stock
                    </span>
                  )
                )}
                {onFlashSale(product) && (
                  <span className="absolute right-2 top-2 rounded-full bg-tomato-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    -{discountPercent(product)}%
                  </span>
                )}
              </div>
              <div className="p-3.5">
                <p className="truncate font-display text-[17px] font-semibold text-gray-900">{product.title}</p>
                <PriceTag product={product} size="sm" suffix={` per ${unitWord(unitOf(product))}`} />
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// The shop's header photo, drifting slower than the page as it scrolls.
function ShopPhoto() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  return (
    <div ref={ref} aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <motion.img
        src={BUYER_PHOTOS.farmTerraces.src}
        srcSet={BUYER_PHOTOS.farmTerraces.srcSet}
        sizes="(min-width: 1280px) 1200px, 100vw"
        alt=""
        decoding="async"
        style={reduced ? undefined : { y }}
        initial={reduced ? false : { scale: 1.12, opacity: 0 }}
        animate={{ scale: 1.04, opacity: 1 }}
        transition={{ duration: 1.3, ease: EASE }}
        className="absolute inset-x-0 -top-[10%] h-[125%] w-full object-cover object-[50%_60%]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgb(12_28_19/0.9)_0%,rgb(15_36_24/0.72)_50%,rgb(31_26_18/0.5)_100%)]" />
    </div>
  );
}

export default function FarmerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { items, removeItems } = useCart();
  const smoothNavigate = useSmoothNavigate();

  // Buyers (and visitors, who are asked to log in first) can report or block a
  // shop; farmers and admins can't.
  const canReport = !user || user.role === "buyer";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Blocking: the confirmation, then the note that it went through. `leave`
  // says what closing that note does - after a block there is no shop left to
  // come back to, so it goes home; after an unblock the shop is right here.
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blockError, setBlockError] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [blockResult, setBlockResult] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // A report just sent from the form left the time behind (utils/reports.js),
  // since stepping back here could not carry it. Shown until it is closed - but
  // not before the page transition that carried us back here has genuinely
  // finished, or its OK button would look clickable while the browser quietly
  // ignores the click (see usePageSettled).
  const [thanksClosed, setThanksClosed] = useState(false);
  const pageSettled = usePageSettled();
  const reported = pageSettled && !thanksClosed && reportJustSent();

  const [farmer, setFarmer] = useState(null);
  const [products, setProducts] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePreserveScroll(tab);

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      getFarmerProfile(id),
      getAllProducts({ farmer: id, includeOutOfStock: true }),
      getAllProducts({ farmer: id, sort: "recommended" }),
    ])
      .then(([farmerRes, productsRes, recommendedRes]) => {
        setFarmer(farmerRes.data);
        setProducts(productsRes.data);
        setRecommended(recommendedRes.data);
      })
      .catch(() => setError("Could not load this farmer's shop."))
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [menuOpen]);

  const closeThanks = () => {
    forgetReportSent();
    setThanksClosed(true);
  };

  const shopName = farmer?.farmName || farmer?.name || "Shop";

  const startReport = () => {
    setMenuOpen(false);
    smoothNavigate(user ? `/buyer/farmers/${id}/report` : "/login");
  };

  const startBlock = () => {
    setMenuOpen(false);
    if (!user) {
      smoothNavigate("/login");
      return;
    }
    setBlockError("");
    setConfirmingBlock(true);
  };

  const handleBlock = async () => {
    setBlockError("");
    setBlocking(true);
    try {
      await blockUser(id);
      // Anything of theirs still sitting in the cart goes with them - the
      // server would refuse those orders now anyway.
      removeItems(items.filter((item) => item.farmerId === id).map((item) => item.productId));
      setConfirmingBlock(false);
      setBlockResult({ message: "User Blocked Successfully", leave: true });
    } catch (err) {
      setBlockError(err.response?.data?.message || "Could not block them. Please try again.");
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async () => {
    setBlockError("");
    setBlocking(true);
    try {
      await unblockUser(id);
      setBlockResult({ message: "User Unblocked Successfully", leave: false });
      // The shop is visible again, so load what was hidden a moment ago.
      setReloadKey((key) => key + 1);
    } catch (err) {
      setBlockError(err.response?.data?.message || "Could not unblock them. Please try again.");
    } finally {
      setBlocking(false);
    }
  };

  const closeBlockResult = () => {
    const leave = blockResult?.leave;
    setBlockResult(null);
    if (leave) smoothNavigate("/buyer/home");
  };

  return (
    <BuyerLayout>
      <div className="p-4 sm:p-8">
        {loading && (
          <div className="space-y-5">
            <BlockSkeleton className="h-48" />
            <BlockSkeleton className="h-64" />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && farmer?.blockedByMe && (
          <div className="mx-auto max-w-md rounded-[1.75rem] bg-paper p-8 text-center shadow-soft ring-1 ring-gray-200">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <Ban className="h-6 w-6" />
            </span>
            <h1 className="mt-4 font-display text-xl font-semibold text-gray-900">You blocked {shopName}</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Their shop, products and listings are hidden from you, and they can&apos;t sell to you.
              Unblock them to see the shop again - you can also do that under Profile &gt; Blocked
              Users.
            </p>
            {blockError && <p className="mt-3 text-sm text-red-600">{blockError}</p>}
            <div className="mt-6 flex gap-3">
              <Link
                to="/buyer/home"
                className="flex-1 rounded-full border border-gray-300 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-brand hover:text-brand"
              >
                Back to Home
              </Link>
              <button
                type="button"
                onClick={handleUnblock}
                disabled={blocking}
                className="flex-1 rounded-full bg-brand py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                {blocking ? "Unblocking..." : "Unblock"}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && farmer && !farmer.blockedByMe && (
          <>
            <div className="relative">
              <div className="relative isolate overflow-hidden rounded-t-[1.75rem] bg-night text-cream" data-testid="shop-header">
                <ShopPhoto />

                <div className={`relative flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8 ${canReport ? "pt-12" : ""}`}>
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={farmer.avatar}
                      alt={shopName}
                      className="h-24 w-24 rounded-full border-4 border-paper bg-forest-100 text-brand shadow-lift"
                      iconClass="h-10 w-10"
                    />
                    <div>
                      <p className="flex items-center gap-2 font-display text-3xl font-semibold text-cream">
                        {shopName}
                        {farmer.isVerified && <BadgeCheck className="h-6 w-6 text-gold-300" />}
                      </p>
                      {activeAgo(farmer.lastActiveAt) && (
                        <p className="text-sm text-cream/80">{activeAgo(farmer.lastActiveAt)}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {farmer.phone && (
                          <a
                            href={`tel:${farmer.phone}`}
                            className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-4 py-1.5 text-sm font-semibold text-night transition-colors duration-150 hover:bg-gold-300 active:scale-95"
                          >
                            <Phone className="h-4 w-4" />
                            Call Now
                          </a>
                        )}
                        <MessageFarmerButton
                          farmerId={farmer._id}
                          className="inline-flex items-center gap-2 rounded-full border border-cream/40 bg-cream/10 px-4 py-[5px] text-sm font-semibold text-cream backdrop-blur-sm transition-colors duration-150 hover:bg-cream/20 active:scale-95 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-2xl bg-night/35 px-4 py-3 ring-1 ring-cream/15 backdrop-blur-sm">
                    <Stat
                      label="Ratings"
                      value={
                        farmer.ratingCount > 0
                          ? `${farmer.rating.toFixed(1)} (${farmer.ratingCount})`
                          : "None yet"
                      }
                    />
                    <Stat label="Joined" value={timeAgo(farmer.createdAt)} />
                    <Stat label="Products" value={farmer.productCount} />
                  </div>
                </div>
              </div>

              {canReport && (
                <div ref={menuRef} className="absolute right-3 top-3 z-20">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label="More options"
                    aria-expanded={menuOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-gray-700 shadow-sm hover:bg-paper"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 overflow-hidden rounded-2xl bg-paper shadow-lift ring-1 ring-black/5">
                      <button
                        type="button"
                        onClick={startReport}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Flag className="h-4 w-4 text-brand" /> Report this user
                      </button>
                      <button
                        type="button"
                        onClick={startBlock}
                        className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Ban className="h-4 w-4 text-brand" /> Block this user
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 rounded-b-[1.75rem] bg-night px-4 py-3" data-testid="shop-tabs">
              {[...baseTabs, ...categoryFilters(products)].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  aria-pressed={tab === key}
                  className={`relative isolate rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 active:scale-95 ${
                    tab === key ? "text-night" : "bg-cream/10 text-cream hover:bg-cream/20"
                  }`}
                >
                  {tab === key && (
                    <motion.span
                      layoutId="shop-tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-gold-300"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {label}
                </button>
              ))}
            </div>

            {tab === "home" ? (
              <>
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-2xl font-semibold text-gray-900">
                      Recommended for You
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab("all")}
                      className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
                    >
                      See All
                    </button>
                  </div>

                  <div className="mt-4">
                    <ProductGrid
                      products={recommended}
                      empty="No highly-rated products from this shop yet."
                    />
                  </div>
                </div>

                <div className="mt-10 rounded-[1.75rem] bg-paper p-6 shadow-soft ring-1 ring-gray-200 sm:p-8">
                  <h2 className="font-display text-2xl font-semibold text-gray-900">
                    About Shop
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {farmer.farmDescription || "This shop hasn't written a description yet."}
                  </p>

                  <dl className="mt-5 grid gap-3 border-t border-gray-200 pt-5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-gray-500">Owner</dt>
                      <dd className="font-medium text-gray-900">{farmer.name}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Location</dt>
                      <dd className="flex items-center gap-1.5 font-medium text-gray-900">
                        <MapPin className="h-4 w-4 text-clay-500" />
                        {farmer.location || "Not set"}
                        {formatDistance(farmer) && (
                          <span className="font-normal text-brand">· {formatDistance(farmer)} from you</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {farmer.certifications?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {farmer.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-800 ring-1 ring-forest-100"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-6">
                {/* A category chosen: its photo from the market across the top. */}
                <AnimatePresence mode="wait">
                  {tab !== "all" && (
                    <motion.div
                      key={tab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="relative isolate mb-6 flex h-28 items-end overflow-hidden rounded-[1.5rem] p-5 text-cream shadow-soft sm:h-32"
                      data-testid="category-banner"
                    >
                      <img
                        src={categoryPhoto(tab).src}
                        srcSet={categoryPhoto(tab).srcSet}
                        sizes="(min-width: 1280px) 1200px, 100vw"
                        alt=""
                        className="absolute inset-0 -z-10 h-full w-full object-cover motion-safe:animate-[harvest-header-in_1.2s_var(--ease-harvest)_both]"
                      />
                      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(12_28_19/0.85)_0%,rgb(15_36_24/0.55)_55%,transparent_100%)]" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200">From this shop</p>
                        <p className="font-display text-2xl font-semibold">{categoryLabel(tab)}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <ProductGrid
                  products={tab === "all" ? products : products.filter((p) => p.category === tab)}
                  empty="Nothing listed in here right now."
                />
              </div>
            )}
          </>
        )}

        {!loading && !error && !farmer && (
          <p className="text-sm text-gray-500">
            Farmer not found.{" "}
            <Link to="/buyer/home" className="text-brand underline">
              Back to Home
            </Link>
          </p>
        )}
      </div>

      {confirmingBlock && (
        <BlockUserModal
          name={shopName}
          error={blockError}
          submitting={blocking}
          onClose={() => setConfirmingBlock(false)}
          onConfirm={handleBlock}
        />
      )}

      {blockResult && (
        <BlockResultDialog message={blockResult.message} onClose={closeBlockResult} />
      )}

      {reported && (
        <Modal title="Successfully Reported" onClose={closeThanks}>
          <p className="text-sm text-gray-600">
            Your report has been submitted successfully. We&apos;ll review the information provided.
          </p>
          <button
            type="button"
            onClick={closeThanks}
            className="mt-5 w-full rounded-md bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            OK
          </button>
        </Modal>
      )}
    </BuyerLayout>
  );
}
