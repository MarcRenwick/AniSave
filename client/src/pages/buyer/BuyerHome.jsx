import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sprout, Star, Sparkles, MapPin, LayoutGrid, Zap } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import HomeBanner from "../../components/buyer/HomeBanner";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../context/AuthContext";
import { getAllProducts, getFarmers } from "../../services/api";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import { cityAndProvince, formatDistance, hasAddressPoint } from "../../utils/address";

// The filter row. Flash Sale used to be reached from a tile beside the banner
// rather than from here; with the tile gone this row is the only way to it, so
// it has a button of its own like the rest.
const sortOptions = [
  { key: "all", label: "All Products", icon: LayoutGrid },
  { key: "recommended", label: "Recommended for You", icon: Star },
  { key: "nearest", label: "Nearest to You", icon: MapPin },
  { key: "newest", label: "Newest Products", icon: Sparkles },
  { key: "flash-sale", label: "Flash Sale", icon: Zap },
];

function ProductGrid({ products, onOpen }) {
  return (
    <div className="grid grid-cols-4 gap-5">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} onOpen={() => onOpen(product._id)} />
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

  useEffect(() => {
    setLoading(true);
    setError("");

    if (browsing) {
      const params = {};
      if (search.trim()) params.search = search.trim();
      // "recommended", "flash-sale" and "nearest" are ranked server-side -
      // nearest by real distance in km between registered addresses.
      // "newest" and "all" both just want the full, unfiltered catalog.
      if (sort === "recommended" || sort === "flash-sale" || sort === "nearest") params.sort = sort;

      getAllProducts(params)
        .then(({ data }) => setProducts(data))
        .catch(() => setError("Could not load products. Is the server running?"))
        .finally(() => setLoading(false));
      return;
    }

    // Recommended has its own section further down the page. Flash Sale no
    // longer needs fetching here: it fed the banner, and the banner is a
    // still picture now - the filter row asks for it when it is wanted.
    Promise.all([
      getAllProducts(),
      getAllProducts({ sort: "recommended" }),
      getFarmers({ sort: "nearest" }),
    ])
      .then(([newestRes, recommendedRes, farmersRes]) => {
        setNewestProducts(newestRes.data.slice(0, 4));
        // The same fetch, kept whole for the "All Products" section at the
        // bottom of the page - already newest-first, no extra request.
        setAllProducts(newestRes.data);
        setRecommendedProducts(recommendedRes.data.slice(0, 4));
        setFarmers(farmersRes.data);
      })
      .catch(() => setError("Could not load the home page. Is the server running?"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

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

  const handleShopNow = () => {
    if (browsing) {
      setSearchParams(new URLSearchParams());
      return;
    }
    document.getElementById("home-products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <BuyerLayout>
      <div className="p-8">
        <div className="mb-8" data-reveal>
          <HomeBanner onShop={handleShopNow} />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm">
            {sortOptions.map(({ key, label, icon: Icon }) => (
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
          <section data-reveal>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              {search.trim() ? "Search Results" : "All Products"}{" "}
              <span className="text-sm font-normal text-gray-400">
                · Sorted by {sortOptions.find((o) => o.key === (sort || "newest"))?.label}
              </span>
            </h2>
            {sort === "nearest" && noAddressHint && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{noAddressHint}</p>
            )}
            {products.length === 0 ? (
              <p className="text-sm text-gray-500">No products found.</p>
            ) : (
              <ProductGrid products={products} onOpen={openProduct} />
            )}
          </section>
        )}

        {!loading && !error && !browsing && (
          <div className="space-y-8">
            <section id="home-products" data-reveal>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">All Products</h2>
              {allProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No products yet.</p>
              ) : (
                <ProductGrid products={allProducts} onOpen={openProduct} />
              )}
            </section>

            <section data-reveal>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Recommended for You</h2>
              {recommendedProducts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No highly-rated products yet - check back once buyers start rating orders.
                </p>
              ) : (
                <ProductGrid products={recommendedProducts} onOpen={openProduct} />
              )}
            </section>

            <section data-reveal>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Nearest Farmers</h2>
              {noAddressHint && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{noAddressHint}</p>
              )}
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
                      <p className="max-w-full truncate text-xs text-gray-500">
                        {cityAndProvince(farmer) || farmer.location || "Location not set"}
                      </p>
                      {formatDistance(farmer) && (
                        <p className="flex items-center gap-1 text-xs font-semibold text-[#2f8f66]">
                          <MapPin className="h-3 w-3" /> {formatDistance(farmer)}
                        </p>
                      )}
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

            <section data-reveal>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Newest Products</h2>
              {newestProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No products yet.</p>
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
