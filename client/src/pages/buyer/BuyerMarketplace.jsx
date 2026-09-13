import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, Handshake, ShieldCheck, Award, ImageOff } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import { getAllProducts, SERVER_URL } from "../../services/api";

const badges = [
  { icon: Leaf, label: "100% Farm-Fresh" },
  { icon: Handshake, label: "Transparent Rates" },
  { icon: ShieldCheck, label: "Verified Local Farms" },
  { icon: Award, label: "Guaranteed Best Value" },
];

export default function BuyerMarketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search.trim()) params.search = search.trim();

    getAllProducts(params)
      .then(({ data }) => setProducts(data))
      .catch(() => setError("Could not load the marketplace. Is the server running?"))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <BuyerLayout>
      <BuyerTopBar search={search} onSearchChange={setSearch}>
        <h1 className="text-2xl font-semibold text-gray-900">Marketplace</h1>
      </BuyerTopBar>

      <div className="p-8">
        {!search && (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-[#2f8f66] p-6 text-white">
              <div className="max-w-sm">
                <h2 className="text-2xl font-bold leading-tight">
                  Fresh Crops.
                  <br />
                  Direct Access.
                  <br />
                  <span className="text-yellow-300">Honest Prices.</span>
                </h2>
                <p className="mt-3 text-sm text-white/90">
                  Order 100% locally-grown produce straight from verified farmers, with no
                  middleman markup.
                </p>
                <button
                  type="button"
                  onClick={() => document.getElementById("marketplace-grid")?.scrollIntoView({ behavior: "smooth" })}
                  className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#2f8f66] transition hover:bg-green-50"
                >
                  Shop Fresh Produce Now
                </button>
              </div>
              <div className="pointer-events-none absolute -right-2 bottom-2 hidden text-7xl opacity-90 sm:block">
                🥕🎃🍅
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl bg-white px-4 py-3 text-xs font-medium text-gray-700 shadow-sm">
              {badges.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-[#2f8f66]" />
                  {label}
                </span>
              ))}
            </div>
          </>
        )}

        {loading && <p className="mt-6 text-sm text-gray-600">Loading products...</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {!loading && !error && products.length === 0 && (
          <p className="mt-6 text-sm text-gray-600">No products found.</p>
        )}

        {!loading && !error && products.length > 0 && (
          <div id="marketplace-grid" className="mt-4 grid grid-cols-4 gap-4">
            {products.map((product) => (
              <button
                key={product._id}
                type="button"
                onClick={() => navigate(`/buyer/products/${product._id}`)}
                className="overflow-hidden rounded-xl bg-white text-left shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-28 items-center justify-center bg-gray-50 text-gray-300">
                  {product.image ? (
                    <img
                      src={`${SERVER_URL}${product.image}`}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="h-8 w-8" />
                  )}
                </div>
                <div className="bg-[#2f8f66] px-3 py-2 text-white">
                  <p className="truncate text-sm font-semibold">{product.title}</p>
                  <p className="text-xs text-white/90">₱{product.price} per kilo</p>
                  <p className="truncate text-[11px] text-white/70">
                    {product.location || product.farmer?.location || "Location not set"}
                  </p>
                  <p className="truncate text-[11px] text-white/70">
                    Sold by {product.farmer?.farmName || product.farmer?.name || "Unknown farmer"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
