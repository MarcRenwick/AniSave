import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Star, Sparkles, MapPin, LayoutGrid, Zap } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import HomeBanner from "../../components/buyer/HomeBanner";
import ProductCard from "../../components/products/ProductCard";
import { CardSkeletons, PhotoEmptyState } from "../../components/buyer/BuyerVisuals";
import { BUYER_PHOTOS } from "../../utils/buyerPhotos";
import { EASE } from "../../theme/harvest";
import { useAuth } from "../../context/AuthContext";
import { getAllProducts, getFarmers } from "../../services/api";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import { cityAndProvince, formatDistance, hasAddressPoint } from "../../utils/address";

// The filter row. Flash Sale is reachable from the tile beside the banner as
// well, and keeps a button here too, so neither is the only way to it.
const sortOptions = [
  { key: "all", label: "All Products", icon: LayoutGrid },
  { key: "recommended", label: "Recommended for You", icon: Star },
  { key: "nearest", label: "Nearest to You", icon: MapPin },
  { key: "newest", label: "Newest Products", icon: Sparkles },
  { key: "flash-sale", label: "Flash Sale", icon: Zap },
];

const FEATURED_SLIDES = 3;

// data-reveal-children, not data-reveal: the cards rise one by one as they
// are scrolled to, rather than the whole grid arriving in one go. A grid of
// fifteen listings is several screens tall, and revealing it as a single
// block means everything past the first row is already there by the time it
// is reached.
//
// Each card is wrapped rather than revealed itself. A card is a <button>, and
// a button already carries a 150ms transition for its hover and press - which
// would win over the reveal's slow drift and leave the card snapping into
// place. A plain wrapper has no such transition to lose the argument with; a
// one-cell grid so the card still fills it in both directions.
//
// When the list changes under it (a different sort), each card glides from
// where it was to where it now belongs, new ones grow in and gone ones fade
// - the motion is on an inner layer, so it never fights the reveal.
function ProductGrid({ products, onOpen, busy = false }) {
  const reduced = useReducedMotion();
  return (
    <div
      className={`grid grid-cols-2 gap-3 transition-opacity duration-300 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 ${busy ? "opacity-55" : ""}`}
      aria-busy={busy || undefined}
      data-reveal-children
    >
      <AnimatePresence initial={false} mode="popLayout">
        {products.map((product) => (
          <div key={product._id} className="grid min-w-0">
            <motion.div
              layout={!reduced}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
              transition={{ layout: { type: "spring", stiffness: 260, damping: 30 }, duration: 0.35, ease: EASE }}
              className="grid min-w-0"
            >
              <ProductCard product={product} onOpen={() => onOpen(product._id)} />
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// A section's heading: the name in the display face, with how many beside it
// (beside, not inside - the heading itself still reads just "All Products").
function SectionTitle({ children, count }) {
  return (
    <div className="mb-4 flex items-baseline gap-3" data-reveal>
      <h2 className="font-display text-2xl font-semibold text-gray-900">{children}</h2>
      {count > 0 && (
        <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-semibold text-forest-800 ring-1 ring-forest-100" aria-label={`${count} listings`}>
          {count}
        </span>
      )}
    </div>
  );
}

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "A";

export default function BuyerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Search and filter live in the URL, so the logo, the Home link and Back all
  // return to the plain Home view. No sort = the curated view.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") || "";
  const sortParam = searchParams.get("sort");
  const sort = sortOptions.some((o) => o.key === sortParam) ? sortParam : null;

  const [products, setProducts] = useState([]);
  const [newestProducts, setNewestProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const browsing = Boolean(search.trim()) || sort !== null;
  usePreserveScroll(searchParams.toString());

  // Opening a listing from the marketplace is a buyer showing interest in that
  // crop, and the listing page counts it as one. Saying so here is what tells
  // it apart from the same page being reached any other way - from the cart,
  // from an order, or by stepping back to it from the ratings.
  const openProduct = (id) =>
    navigate(`/buyer/products/${id}`, { state: { fromBrowse: true } });

  const setSort = (value) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("sort", value);
      else next.delete("sort");
      return next;
    });

  // Only the newest fetch is shown: typing a search, or a listing changing,
  // can start another before the last one has answered.
  const latestFetch = useRef(0);

  // `refresh`: fetching what is already on screen again because a listing
  // changed - which isn't the buyer searching again (see getAllProducts).
  const fetchListings = ({ refresh = false } = {}) => {
    const ticket = ++latestFetch.current;
    const isLatest = () => ticket === latestFetch.current;

    if (browsing) {
      const params = refresh ? { refresh: true } : {};
      if (search.trim()) params.search = search.trim();
      // "recommended", "flash-sale" and "nearest" are ranked server-side -
      // nearest by real distance in km between registered addresses.
      // "newest" and "all" both just want the full, unfiltered catalog.
      if (sort === "recommended" || sort === "flash-sale" || sort === "nearest") params.sort = sort;

      return getAllProducts(params).then(({ data }) => {
        if (isLatest()) setProducts(data);
      });
    }

    // Flash Sale feeds the banner at the top; Recommended is its own section
    // further down the page.
    return Promise.all([
      getAllProducts(),
      getAllProducts({ sort: "flash-sale" }),
      getAllProducts({ sort: "recommended" }),
      getFarmers({ sort: "nearest" }),
    ]).then(([newestRes, flashSaleRes, recommendedRes, farmersRes]) => {
      if (!isLatest()) return;
      setNewestProducts(newestRes.data.slice(0, 4));
      // The same fetch, kept whole for the "All Products" section at the
      // bottom of the page - already newest-first, no extra request.
      setAllProducts(newestRes.data);
      setFlashSaleProducts(flashSaleRes.data.slice(0, 4));
      setRecommendedProducts(recommendedRes.data.slice(0, 4));
      setFarmers(farmersRes.data);
    });
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchListings()
      .catch(() =>
        setError(browsing ? "Could not load products. Is the server running?" : "Could not load the home page. Is the server running?")
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  // A listing added, restocked, sold out, rated or taken down shows here
  // without a refresh. Every buyer hears of it at once, so their tabs spread
  // their fetches over a moment rather than all asking together.
  useLiveRefresh(["product:changed"], () => fetchListings({ refresh: true }), { spread: 1500 });

  // Already nearest-first from the server when this account has a registered
  // address, so it's just the top of the list.
  const nearestFarmers = farmers.slice(0, 4);

  // "Nearest" is measured from a registered address, so say so when there isn't one.
  const noAddressHint = hasAddressPoint(user) ? null : user ? (
    <>
      Add your address in your{" "}
      <Link to="/buyer/settings" className="font-semibold underline">
        Profile
      </Link>{" "}
      to see how far away each farmer is.
    </>
  ) : (
    <>
      <Link to="/login" className="font-semibold underline">
        Log in
      </Link>{" "}
      with your registered address to see how far away each farmer is.
    </>
  );

  // Real listings for the banner: Flash Sale items first, topped up with the
  // newest, and only ones with a photo to show.
  const flashSaleIds = new Set(flashSaleProducts.map((p) => p._id));
  const featured = [...flashSaleProducts, ...newestProducts]
    .filter((p, i, all) => p.image && all.findIndex((q) => q._id === p._id) === i)
    .slice(0, FEATURED_SLIDES)
    .map((product) => ({
      product,
      tag: flashSaleIds.has(product._id) ? "Flash Sale" : "Just Listed",
    }));

  const handleShopNow = () => {
    if (browsing) {
      setSearchParams(new URLSearchParams());
      return;
    }
    document.getElementById("home-products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <BuyerLayout>
      <div className="p-4 sm:p-8">
        <div className="mb-10" data-reveal>
          <HomeBanner
            featured={featured}
            buyerLocation={user?.address?.city || user?.location}
            onShop={handleShopNow}
            onBrowse={setSort}
            onOpenProduct={openProduct}
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 rounded-[1.4rem] bg-paper px-3 py-2.5 shadow-soft ring-1 ring-gray-200" data-testid="sort-row">
            {sortOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(sort === key ? null : key)}
                aria-pressed={sort === key}
                className={`relative isolate flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 active:scale-95 ${
                  sort === key ? "text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {sort === key && (
                  <motion.span
                    layoutId="market-sort-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-brand shadow-[0_8px_18px_-10px_rgb(31_81_48/0.9)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className={`h-4 w-4 ${sort === key ? "" : "text-clay-500"}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading: placeholders the shape of the cards - unless a sorted
            list is already showing, which stays (dimmed) so its cards can
            glide to their new places when the next order arrives. */}
        {loading && !(browsing && products.length > 0) && <CardSkeletons />}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {(!loading || products.length > 0) && !error && browsing && (
          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold text-gray-900" data-reveal>
              {search.trim() ? "Search Results" : "All Products"}{" "}
              <span className="font-body text-sm font-normal text-gray-500">
                · Sorted by {sortOptions.find((o) => o.key === (sort || "newest"))?.label}
              </span>
            </h2>
            {sort === "nearest" && noAddressHint && (
              <p className="mb-4 rounded-xl bg-gold-50 px-3.5 py-2.5 text-xs text-soil-700 ring-1 ring-gold-100">{noAddressHint}</p>
            )}
            {products.length === 0 ? (
              <PhotoEmptyState photo={BUYER_PHOTOS.marketLane} title="No products found.">
                Try another word, or browse everything the farms near you have listed.
              </PhotoEmptyState>
            ) : (
              <ProductGrid products={products} onOpen={openProduct} busy={loading} />
            )}
          </section>
        )}

        {!loading && !error && !browsing && (
          <div className="space-y-12">
            <section id="home-products">
              <SectionTitle count={allProducts.length}>All Products</SectionTitle>
              {allProducts.length === 0 ? (
                <PhotoEmptyState photo={BUYER_PHOTOS.marketLane} title="No products yet.">
                  Farmers&apos; listings show up here as soon as they post them.
                </PhotoEmptyState>
              ) : (
                <ProductGrid products={allProducts} onOpen={openProduct} />
              )}
            </section>

            <section>
              <SectionTitle>Recommended for You</SectionTitle>
              {recommendedProducts.length === 0 ? (
                <p className="rounded-xl bg-paper px-4 py-3 text-sm text-gray-500 ring-1 ring-gray-200">
                  No highly-rated products yet - check back once buyers start rating orders.
                </p>
              ) : (
                <ProductGrid products={recommendedProducts} onOpen={openProduct} />
              )}
            </section>

            <section>
              <SectionTitle>Nearest Farmers</SectionTitle>
              {noAddressHint && (
                <p className="mb-4 rounded-xl bg-gold-50 px-3.5 py-2.5 text-xs text-soil-700 ring-1 ring-gold-100">{noAddressHint}</p>
              )}
              {nearestFarmers.length === 0 ? (
                <p className="rounded-xl bg-paper px-4 py-3 text-sm text-gray-500 ring-1 ring-gray-200">No farmers yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" data-reveal-children>
                  {nearestFarmers.map((farmer, i) => (
                    // Wrapped for the same reason as a listing card: the tile
                    // is a button, and its own transition would outrun the
                    // reveal.
                    <div key={farmer._id} className="grid">
                    <button
                      type="button"
                      onClick={() => navigate(`/buyer/farmers/${farmer._id}`)}
                      className="group flex flex-col items-center gap-2 overflow-hidden rounded-[1.4rem] bg-paper px-4 pb-4 text-center shadow-soft ring-1 ring-gray-200 transition-[translate,box-shadow] duration-300 ease-harvest hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 active:scale-[0.97]"
                      data-testid="farm-tile"
                    >
                      <span className="relative -mx-4 block h-20 w-[calc(100%+2rem)] overflow-hidden">
                        <img
                          src={BUYER_PHOTOS.farmTerraces.src}
                          srcSet={BUYER_PHOTOS.farmTerraces.srcSet}
                          sizes="16rem"
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 ease-harvest group-hover:scale-110"
                          style={{ objectPosition: `${[20, 50, 80, 35][i % 4]}% 60%` }}
                        />
                        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/45 to-transparent" />
                      </span>
                      {/* Positioned so it paints over the photo it overlaps
                          (the photo's wrapper is positioned, and would
                          otherwise cover the top of the circle). */}
                      <div className="relative z-10 -mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-forest-700 font-display text-lg font-semibold text-cream ring-4 ring-paper">
                        {initials(farmer.farmName || farmer.name)}
                      </div>
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {farmer.farmName || farmer.name}
                      </p>
                      <p className="max-w-full truncate text-xs text-gray-500">
                        {cityAndProvince(farmer) || farmer.location || "Location not set"}
                      </p>
                      {formatDistance(farmer) && (
                        <p className="flex items-center gap-1 text-xs font-semibold text-brand">
                          <MapPin className="h-3 w-3" /> {formatDistance(farmer)}
                        </p>
                      )}
                      {farmer.rating > 0 && (
                        <p className="flex items-center gap-1 text-xs font-semibold text-gold-700">
                          <Star className="h-3 w-3 fill-current" /> {farmer.rating.toFixed(1)}
                        </p>
                      )}
                    </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionTitle>Newest Products</SectionTitle>
              {newestProducts.length === 0 ? (
                <p className="rounded-xl bg-paper px-4 py-3 text-sm text-gray-500 ring-1 ring-gray-200">No products yet.</p>
              ) : (
                <ProductGrid products={newestProducts} onOpen={openProduct} />
              )}
            </section>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
