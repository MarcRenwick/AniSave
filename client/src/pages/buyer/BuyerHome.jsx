import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageOff, Sprout, Star } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import { useAuth } from "../../context/AuthContext";
import { getAllProducts, getFarmers, SERVER_URL } from "../../services/api";

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
          </div>
        </button>
      ))}
    </div>
  );
}

export default function BuyerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([getAllProducts(), getFarmers()])
      .then(([productsRes, farmersRes]) => {
        setProducts(productsRes.data);
        setFarmers(farmersRes.data);
      })
      .catch(() => setError("Could not load the home page. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  const newestProducts = products.slice(0, 4);

  const recommended = [...products]
    .sort((a, b) => (b.farmer?.rating || 0) - (a.farmer?.rating || 0))
    .slice(0, 4);

  const nearestFarmers = [...farmers]
    .sort((a, b) => locationScore(b.location, user?.location) - locationScore(a.location, user?.location))
    .slice(0, 4);

  return (
    <BuyerLayout>
      <BuyerTopBar search="">
        <h1 className="text-2xl font-semibold text-gray-900">Home</h1>
      </BuyerTopBar>

      <div className="space-y-8 p-8">
        {loading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Newest Products</h2>
              {newestProducts.length === 0 ? (
                <p className="text-sm text-gray-500">No products yet.</p>
              ) : (
                <ProductGrid products={newestProducts} navigate={navigate} />
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Recommended for You</h2>
              {recommended.length === 0 ? (
                <p className="text-sm text-gray-500">No products yet.</p>
              ) : (
                <ProductGrid products={recommended} navigate={navigate} />
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
                      className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 text-center shadow-sm transition hover:shadow-md"
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
          </>
        )}
      </div>
    </BuyerLayout>
  );
}
