import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BadgeCheck, Flag, ImageOff, MapPin, MoreVertical, Phone } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import Avatar from "../../components/Avatar";
import Modal from "../../components/Modal";
import PriceTag from "../../components/products/PriceTag";
import shopBackground from "../../assets/bckgrnd.jpg";
import { useAuth } from "../../context/AuthContext";
import { getFarmerProfile, getAllProducts, SERVER_URL } from "../../services/api";
import { activeAgo, timeAgo } from "../../utils/activity";
import { onFlashSale, discountPercent } from "../../utils/pricing";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import { formatDistance } from "../../utils/address";
import { forgetReportSent, reportJustSent } from "../../utils/reports";
import { useSmoothNavigate } from "../../utils/pageTransition";

const tabs = [
  { key: "home", label: "Home" },
  { key: "all", label: "All Products" },
  { key: "vegetable", label: "Vegetables" },
  { key: "fruit", label: "Fruits" },
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
  const smoothNavigate = useSmoothNavigate();

  // Buyers (and visitors, who are asked to log in first) can report a shop;
  // farmers and admins can't.
  const canReport = !user || user.role === "buyer";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  // A report just sent from the form left the time behind (utils/reports.js),
  // since stepping back here could not carry it. Shown until it is closed.
  const [thanksClosed, setThanksClosed] = useState(false);
  const reported = !thanksClosed && reportJustSent();

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
  }, [id]);

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

  return (
    <BuyerLayout>
      <div className="p-8">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && farmer && (
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
                      {farmer.phone && (
                        <a
                          href={`tel:${farmer.phone}`}
                          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#2f8f66] px-4 py-1.5 text-sm font-semibold text-white transition duration-150 hover:bg-[#267a56] active:scale-95"
                        >
                          <Phone className="h-4 w-4" />
                          Call Now
                        </a>
                      )}
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
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 rounded-b-2xl bg-[#2f8f66] px-4 py-3">
              {tabs.map(({ key, label }) => (
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
