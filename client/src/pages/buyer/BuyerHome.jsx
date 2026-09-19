import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ImageOff, Sprout, Star, Sparkles, MapPin, LayoutGrid, Zap } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import HomeBanner from "../../components/buyer/HomeBanner";
import PriceTag from "../../components/products/PriceTag";
import { useAuth } from "../../context/AuthContext";
import { getAllProducts, getFarmers, SERVER_URL } from "../../services/api";
import { onFlashSale, discountPercent } from "../../utils/pricing";
import usePreserveScroll from "../../hooks/usePreserveScroll";

// The filter row shows these four. Flash Sale is a real, valid sort (kept
// here so the URL param and the "Sorted by ..." label still resolve) but
// isn't one of the row's buttons - it's reached only from the banner tile.
const sortOptions = [
  { key: "newest", label: "Newest Products", icon: Sparkles },
  { key: "recommended", label: "Recommended for You", icon: Star },
  { key: "nearest", label: "Nearest to You", icon: MapPin },
  { key: "all", label: "All Products", icon: LayoutGrid },
  { key: "flash-sale", label: "Flash Sale", icon: Zap },
];
const chipOptions = sortOptions.filter((o) => o.key !== "flash-sale");

const FEATURED_SLIDES = 3;

function locationScore(farmerLocation, buyerLocation) {
  if (!buyerLocation || !farmerLocation) return 0;
  const f = farmerLocation.toLowerCase();
  const b = buyerLocation.toLowerCase();
  if (f === b) return 2;
  if (f.includes(b) || b.includes(f)) return 1;
  return 0;
}

function ProductGrid({ products, navigate }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {products.map((product) => (
        <button
          key={product._id}
          type="button"
          onClick={() => navigate(`/buyer/products/${product._id}`)}
          className="overflow-hidden rounded-xl bg-white text-left shadow-sm transition duration-150 hover:shadow-md active:scale-[0.97]"
        >
          <div className="relative flex h-28 items-center justify-center bg-gray-50 text-gray-300">
            {product.image ? (
              <img
                src={`${SERVER_URL}${product.image}`}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageOff className="h-8 w-8" />
            )}
            {product.productType === "preorder" && (
              <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                Pre-order
              </span>
            )}
            {onFlashSale(product) && (
              <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                -{discountPercent(product)}%
              </span>
            )}
          </div>
          <div className="bg-[#2f8f66] px-3 py-2 text-white">
            <p className="truncate text-sm font-semibold">{product.title}</p>
            <PriceTag product={product} tone="light" size="sm" suffix=" per kilo" />
            <p className="truncate text-[11px] text-white/70">
              {product.location || product.farmer?.location || "Location not set"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

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

  const setSort = (value) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("sort", value);
      else next.delete("sort");
      return next;
    });

  useEffect(() => {
    setLoading(true);
    setError("");

    if (browsing) {
      const params = {};
      if (search.trim()) params.search = search.trim();
      // "recommended" and "flash-sale" are filtered/ranked server-side.
      // "newest" and "all" both just want the full, unfiltered catalog -
      // "nearest" starts from that same catalog and is then re-sorted
      // client-side by comparing each product's own location to the
      // buyer's, the same way Nearest Farmers already works.
      if (sort === "recommended" || sort === "flash-sale") params.sort = sort;

      getAllProducts(params)
        .then(({ data }) => {
          const ordered =
            sort === "nearest"
              ? [...data].sort(
                  (a, b) =>
                    locationScore(b.location || b.farmer?.location, user?.location) -
                    locationScore(a.location || a.farmer?.location, user?.location)
                )
              : data;
          setProducts(ordered);
        })
        .catch(() => setError("Could not load products. Is the server running?"))
        .finally(() => setLoading(false));
      return;
    }

    // Flash Sale feeds the banner at the top; Recommended is its own section
    // further down the page.
    Promise.all([
      getAllProducts(),
      getAllProducts({ sort: "flash-sale" }),
      getAllProducts({ sort: "recommended" }),
      getFarmers(),
    ])
      .then(([newestRes, flashSaleRes, recommendedRes, farmersRes]) => {
        setNewestProducts(newestRes.data.slice(0, 4));
        // The same fetch, kept whole for the "All Products" section at the
        // bottom of the page - already newest-first, no extra request.
        setAllProducts(newestRes.data);
        setFlashSaleProducts(flashSaleRes.data.slice(0, 4));
        setRecommendedProducts(recommendedRes.data.slice(0, 4));
        setFarmers(farmersRes.data);
      })
      .catch(() => setError("Could not load the home page. Is the server running?"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  const nearestFarmers = [...farmers]
    .sort((a, b) => locationScore(b.location, user?.location) - locationScore(a.location, user?.location))
    .slice(0, 4);

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
    document.getElementById("home-newest")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <BuyerLayout>
      <div className="p-8">
        <div className="mb-8">
          <HomeBanner
            featured={featured}
            buyerLocation={user?.location}
            onShop={handleShopNow}
            onBrowse={setSort}
            onOpenProduct={(id) => navigate(`/buyer/products/${id}`)}
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm">
            {chipOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(sort === key ? null : key)}
                aria-pressed={sort === key}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition duration-150 active:scale-95 ${
                  sort === key ? "bg-[#2f8f66] text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className={`h-4 w-4 ${sort === key ? "" : "text-[#2f8f66]"}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && browsing && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {search.trim() ? "Search Results" : "All Products"}{" "}
              <span className="text-sm font-normal text-gray-400">
                · Sorted by {sortOptions.find((o) => o.key === (sort || "newest"))?.label}
              </span>
            </h2>
            {products.length === 0 ? (
              <p className="text-sm text-gray-500">No products found.</p>
            ) : (
              <ProductGrid products={products} navigate={navigate} />
            )}
          </section>
        )}

        {!loading && !error && !browsing && (
          <div className="space-y-8">
            <section id="home-newest">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Newest Products</h2>
              {newestProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No products yet.</p>
              ) : (
                <ProductGrid products={newestProducts} navigate={navigate} />
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Recommended for You</h2>
              {recommendedProducts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No highly-rated products yet - check back once buyers start rating orders.
                </p>
              ) : (
                <ProductGrid products={recommendedProducts} navigate={navigate} />
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Nearest Farmers</h2>
              {nearestFarmers.length === 0 ? (
                <p className="text-sm text-gray-500">No farmers yet.</p>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {nearestFarmers.map((farmer) => (
                    <button
                      key={farmer._id}
                      type="button"
                      onClick={() => navigate(`/buyer/farmers/${farmer._id}`)}
                      className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 text-center shadow-sm transition duration-150 hover:shadow-md active:scale-[0.97]"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-[#2f8f66]">
                        <Sprout className="h-6 w-6" />
                      </div>
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {farmer.farmName || farmer.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">{farmer.location || "Location not set"}</p>
                      {farmer.rating > 0 && (
                        <p className="flex items-center gap-1 text-xs text-amber-500">
                          <Star className="h-3 w-3 fill-current" /> {farmer.rating.toFixed(1)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">All Products</h2>
              {allProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No products yet.</p>
              ) : (
                <ProductGrid products={allProducts} navigate={navigate} />
              )}
            </section>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
