import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BadgeCheck, Ban, Flag, ImageOff, MapPin, MoreVertical, Phone } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import Avatar from "../../components/Avatar";
import Modal from "../../components/Modal";
import BlockUserModal from "../../components/buyer/BlockUserModal";
import BlockResultDialog from "../../components/buyer/BlockResultDialog";
import MessageFarmerButton from "../../components/chat/MessageFarmerButton";
import PriceTag from "../../components/products/PriceTag";
import shopBackground from "../../assets/bckgrnd.jpg";
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
import { categoryFilters } from "../../utils/categories";

const baseTabs = [
  { key: "home", label: "Home" },
  { key: "all", label: "All Products" },
];

function Stat({ label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">{label}:</span>
      <span className="font-semibold text-red-600">{value}</span>
    </div>
  );
}

function ProductGrid({ products, empty }) {
  if (products.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">{empty}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <Link
          key={product._id}
          to={`/buyer/products/${product._id}`}
          // A shop page is a place buyers browse, so opening a listing from
          // here counts as interest in the same way the marketplace does.
          state={{ fromBrowse: true }}
          className="overflow-hidden rounded-xl bg-white shadow-sm transition duration-150 hover:shadow-md active:scale-[0.98]"
        >
          <div className="relative flex h-32 w-full items-center justify-center bg-gray-50 text-gray-300">
            {product.image ? (
              <img
                src={`${SERVER_URL}${product.image}`}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageOff className="h-10 w-10" />
            )}
            {product.productType === "preorder" ? (
              <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                Pre-order
              </span>
            ) : (
              product.stock === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-gray-700/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Out of stock
                </span>
              )
            )}
            {onFlashSale(product) && (
              <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                -{discountPercent(product)}%
              </span>
            )}
          </div>
          <div className="p-3">
            <p className="truncate font-semibold text-gray-900">{product.title}</p>
            <PriceTag product={product} size="sm" suffix=" per kilo" />
          </div>
        </Link>
      ))}
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
      <div className="p-8">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && farmer?.blockedByMe && (
          <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <Ban className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-gray-900">You blocked {shopName}</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Their shop, products and listings are hidden from you, and they can&apos;t sell to you.
              Unblock them to see the shop again - you can also do that under Profile &gt; Blocked
              Users.
            </p>
            {blockError && <p className="mt-3 text-sm text-red-600">{blockError}</p>}
            <div className="mt-6 flex gap-3">
              <Link
                to="/buyer/home"
                className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Back to Home
              </Link>
              <button
                type="button"
                onClick={handleUnblock}
                disabled={blocking}
                className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
              >
                {blocking ? "Unblocking..." : "Unblock"}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && farmer && !farmer.blockedByMe && (
          <>
            <div className="relative">
              <div
                className="relative overflow-hidden rounded-t-2xl bg-cover bg-center"
                style={{ backgroundImage: `url(${shopBackground})` }}
              >
                <div className="absolute inset-0 bg-white/85" />

                <div className={`relative flex flex-wrap items-center justify-between gap-6 p-6 ${canReport ? "pt-10" : ""}`}>
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={farmer.avatar}
                      alt={shopName}
                      className="h-20 w-20 rounded-full border-4 border-white bg-green-100 text-[#2f8f66] shadow-sm"
                      iconClass="h-10 w-10"
                    />
                    <div>
                      <p className="flex items-center gap-2 text-xl font-bold text-gray-900">
                        {shopName}
                        {farmer.isVerified && <BadgeCheck className="h-5 w-5 text-[#2f8f66]" />}
                      </p>
                      {activeAgo(farmer.lastActiveAt) && (
                        <p className="text-sm text-gray-600">{activeAgo(farmer.lastActiveAt)}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {farmer.phone && (
                          <a
                            href={`tel:${farmer.phone}`}
                            className="inline-flex items-center gap-2 rounded-full bg-[#2f8f66] px-4 py-1.5 text-sm font-semibold text-white transition duration-150 hover:bg-[#267a56] active:scale-95"
                          >
                            <Phone className="h-4 w-4" />
                            Call Now
                          </a>
                        )}
                        <MessageFarmerButton
                          farmerId={farmer._id}
                          className="inline-flex items-center gap-2 rounded-full border border-[#2f8f66] bg-white px-4 py-[5px] text-sm font-semibold text-[#2f8f66] transition duration-150 hover:bg-green-50 active:scale-95 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
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
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-sm hover:bg-white"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
                      <button
                        type="button"
                        onClick={startReport}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Flag className="h-4 w-4 text-[#2f8f66]" /> Report this user
                      </button>
                      <button
                        type="button"
                        onClick={startBlock}
                        className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Ban className="h-4 w-4 text-[#2f8f66]" /> Block this user
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 rounded-b-2xl bg-[#2f8f66] px-4 py-3">
              {[...baseTabs, ...categoryFilters(products)].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition duration-150 active:scale-95 ${
                    tab === key ? "bg-white text-[#1f5c42]" : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "home" ? (
              <>
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                      Recommended for You
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab("all")}
                      className="text-sm font-medium text-[#2f8f66] hover:underline"
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

                <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                    About Shop
                  </h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {farmer.farmDescription || "This shop hasn't written a description yet."}
                  </p>

                  <dl className="mt-5 grid gap-3 border-t border-gray-100 pt-5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-gray-500">Owner</dt>
                      <dd className="font-medium text-gray-900">{farmer.name}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Location</dt>
                      <dd className="flex items-center gap-1.5 font-medium text-gray-900">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {farmer.location || "Not set"}
                        {formatDistance(farmer) && (
                          <span className="font-normal text-[#2f8f66]">· {formatDistance(farmer)} from you</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {farmer.certifications?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {farmer.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
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
            <Link to="/buyer/home" className="text-[#2f8f66] underline">
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
            className="mt-5 w-full rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56]"
          >
            OK
          </button>
        </Modal>
      )}
    </BuyerLayout>
  );
}
