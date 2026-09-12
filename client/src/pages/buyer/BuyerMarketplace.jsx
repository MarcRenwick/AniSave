import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, MapPin, ImageOff, BadgeCheck } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import { getAllProducts, SERVER_URL } from "../../services/api";

const categoryFilters = [
  { key: "all", label: "All" },
  { key: "vegetable", label: "Vegetables" },
  { key: "fruit", label: "Fruits" },
];

export default function BuyerMarketplace() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category !== "all") params.category = category;
    if (location.trim()) params.location = location.trim();

    getAllProducts(params)
      .then(({ data }) => setProducts(data))
      .catch(() => setError("Could not load the marketplace. Is the server running?"))
      .finally(() => setLoading(false));
  }, [category, location]);

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Marketplace</h1>
        <p className="text-sm text-gray-500">Browse fresh produce from local farmers</p>
      </BuyerTopBar>

      <div className="p-8">
        <div className="flex flex-wrap items-center gap-3">
          {categoryFilters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                category === key
                  ? "bg-[#2f8f66] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {key !== "all" && <Leaf className="h-4 w-4" />}
              {label}
            </button>
          ))}

          <div className="relative ml-auto">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Filter by location..."
              className="w-56 rounded-full border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
            />
          </div>
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500">Loading products...</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {!loading && !error && products.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">No products match your filters right now.</p>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="mt-6 grid grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product._id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex h-32 w-full items-center justify-center bg-gray-50 text-gray-300">
                  {product.image ? (
                    <img
                      src={`${SERVER_URL}${product.image}`}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="h-10 w-10" />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900">{product.title}</p>
                  <p className="text-sm text-gray-500">₱{product.price} / kg</p>
                  <p className="text-xs text-gray-400">{product.stock}kg available</p>

                  <button
                    type="button"
                    onClick={() => navigate(`/buyer/farmers/${product.farmer._id}`)}
                    className="mt-3 flex w-full items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-left text-xs hover:bg-gray-50"
                  >
                    <span className="flex-1 truncate">
                      <span className="font-medium text-gray-700">
                        {product.farmer?.farmName || product.farmer?.name}
                      </span>
                      <span className="block text-gray-400">{product.farmer?.location}</span>
                    </span>
                    {product.farmer?.isVerified && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-[#2f8f66]" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
