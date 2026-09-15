import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, BadgeCheck, Star, ImageOff, Clock } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import { getFarmerProfile, getAllProducts, SERVER_URL } from "../../services/api";
import { activeAgo } from "../../utils/activity";

export default function FarmerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([getFarmerProfile(id), getAllProducts({ farmer: id })])
      .then(([farmerRes, productsRes]) => {
        setFarmer(farmerRes.data);
        setProducts(productsRes.data);
      })
      .catch(() => setError("Could not load this farmer's profile."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>
      </BuyerTopBar>

      <div className="p-8">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && farmer && (
          <>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {farmer.farmName || farmer.name}
                  </h1>
                  <p className="text-sm text-gray-500">{farmer.name}</p>
                </div>
                {farmer.isVerified && (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-[#2f8f66]">
                    <BadgeCheck className="h-4 w-4" />
                    Verified Farmer
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {farmer.location || "Location not set"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {farmer.ratingCount > 0
                    ? `${farmer.rating.toFixed(1)} (${farmer.ratingCount} rating${
                        farmer.ratingCount === 1 ? "" : "s"
                      })`
                    : "No ratings yet"}
                </span>
                {activeAgo(farmer.lastActiveAt) && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {activeAgo(farmer.lastActiveAt)}
                  </span>
                )}
              </div>

              {farmer.farmDescription && (
                <p className="mt-4 text-sm text-gray-700">{farmer.farmDescription}</p>
              )}

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

            <h2 className="mt-8 text-lg font-semibold text-gray-900">
              Products from {farmer.farmName || farmer.name}
            </h2>

            {products.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No products in stock right now.</p>
            ) : (
              <div className="mt-4 grid grid-cols-4 gap-6">
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !error && !farmer && (
          <p className="text-sm text-gray-500">
            Farmer not found. <Link to="/buyer/home" className="text-[#2f8f66] underline">Back to Home</Link>
          </p>
        )}
      </div>
    </BuyerLayout>
  );
}
