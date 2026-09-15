import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageOff, Sprout, Star, Leaf, Handshake, ShieldCheck, Award } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import HomeBanner from "../../components/buyer/HomeBanner";
import { useAuth } from "../../context/AuthContext";
import { getAllProducts, getFarmers, SERVER_URL } from "../../services/api";

const badges = [
  { icon: Leaf, label: "100% Farm-Fresh" },
  { icon: Handshake, label: "Transparent Rates" },
  { icon: ShieldCheck, label: "Verified Local Farms" },
  { icon: Award, label: "Guaranteed Best Value" },
];

const sortOptions = [
  { key: "newest", label: "Newest Products" },
  { key: "recommended", label: "Recommended for You" },
  { key: "nearest", label: "Nearest to You" },
  { key: "all", label: "All Products" },
];

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
          </div>
          <div className="bg-[#2f8f66] px-3 py-2 text-white">
            <p className="truncate text-sm font-semibold">{product.title}</p>
            <p className="text-xs text-white/90">₱{product.price} per kilo</p>
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

  const [search, setSearch] = useState("");
  // null = no explicit sort chosen yet, so the curated Home view still
  // shows; picking any option (including "Newest") switches to a single
  // sorted results grid even with an empty search box.
  const [sort, setSort] = useState(null);
  const [products, setProducts] = useState([]);
  const [newestProducts, setNewestProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const browsing = Boolean(search.trim()) || sort !== null;

  useEffect(() => {
    setLoading(true);
    setError("");

    if (browsing) {
      const params = {};
      if (search.trim()) params.search = search.trim();
      // "recommended" is filtered/ranked server-side (real ratings+sales).
      // "newest" and "all" both just want the full, unfiltered catalog -
      // "nearest" starts from that same catalog and is then re-sorted
      // client-side by comparing each product's own location to the
      // buyer's, the same way Nearest Farmers already works.
      if (sort === "recommended") params.sort = "recommended";

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

    Promise.all([getAllProducts(), getAllProducts({ sort: "recommended" }), getFarmers()])
      .then(([newestRes, recommendedRes, farmersRes]) => {
        setNewestProducts(newestRes.data.slice(0, 4));
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

  // Real listings for the banner: well-rated ones first, topped up with the
  // newest, and only ones with a photo to show.
  const recommendedIds = new Set(recommendedProducts.map((p) => p._id));
  const featured = [...recommendedProducts, ...newestProducts]
    .filter((p, i, all) => p.image && all.findIndex((q) => q._id === p._id) === i)
    .slice(0, FEATURED_SLIDES)
    .map((product) => ({
      product,
      tag: recommendedIds.has(product._id) ? "Top Rated" : "Just Listed",
    }));

  return (
    <BuyerLayout>
      <BuyerTopBar
        search={search}
        onSearchChange={setSearch}
        sortOptions={sortOptions}
        sortValue={sort}
        onSortChange={setSort}
      >
        <h1 className="text-2xl font-semibold text-gray-900">Home</h1>
      </BuyerTopBar>

      <div className="p-8">
        {!browsing && (
          <div className="mb-8">
            <HomeBanner
              featured={featured}
              buyerLocation={user?.location}
              onShop={() => document.getElementById("home-newest")?.scrollIntoView({ behavior: "smooth" })}
              onBrowse={setSort}
              onOpenProduct={(id) => navigate(`/buyer/products/${id}`)}
            />

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl bg-white px-4 py-3 text-xs font-medium text-gray-700 shadow-sm">
              {badges.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-[#2f8f66]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

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
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
