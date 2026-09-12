import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Package, ImageOff, Star } from "lucide-react";
import BuyerStoreLayout from "../../layouts/BuyerStoreLayout";
import { getProduct, createOrder, SERVER_URL } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buyMessage, setBuyMessage] = useState("");
  const [buyError, setBuyError] = useState("");

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then(({ data }) => {
        setProduct(data);
        setQuantity(data.stock > 0 ? 1 : 0);
      })
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));
  }, [id]);

  const adjustQuantity = (delta) => {
    setQuantity((q) => Math.min(product.stock, Math.max(1, q + delta)));
  };

  const handleBuyNow = async () => {
    setBuyError("");
    setBuyMessage("");
    setBuying(true);
    try {
      await createOrder(product._id, quantity);
      setBuyMessage("Order placed! The farmer has been notified.");
      setProduct((p) => ({ ...p, stock: p.stock - quantity }));
      setQuantity(1);
    } catch (err) {
      setBuyError(err.response?.data?.message || "Could not place the order. Please try again.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <BuyerStoreLayout onBack={() => navigate(-1)}>
      {loading && <p className="text-sm text-gray-600">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && product && (
        <div className="grid grid-cols-2 gap-8 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl bg-gray-50 text-gray-300">
              {product.image ? (
                <img
                  src={`${SERVER_URL}${product.image}`}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageOff className="h-16 w-16" />
              )}
            </div>

            {buyMessage && (
              <div className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                {buyMessage}
              </div>
            )}
            {buyError && (
              <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{buyError}</div>
            )}

            {user?.role === "buyer" ? (
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={buying || product.stock === 0}
                className="mt-4 w-full rounded-md bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {product.stock === 0 ? "Out of Stock" : buying ? "Placing Order..." : "Buy Now"}
              </button>
            ) : (
              <Link
                to="/login"
                className="mt-4 block w-full rounded-md bg-red-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Log in as a buyer to order
              </Link>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <Star className="h-4 w-4 text-gray-300" />
              No ratings yet · Sold {product.sold || 0}
            </p>

            <div className="mt-4 rounded-md bg-[#2f8f66] px-4 py-2 text-lg font-semibold text-white">
              ₱{product.price} per kilo
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-400" />
                <dt className="text-gray-500">Pick up</dt>
                <dd className="font-medium text-gray-900">Ready for pickup</dd>
              </div>
              <div>
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium capitalize text-gray-900">{product.category}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Address</dt>
                <dd className="font-medium text-gray-900">
                  {product.location || product.farmer?.location || "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Quantity</dt>
                <dd className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(-1)}
                    className="h-8 w-8 rounded-md border border-gray-300 text-lg font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium text-gray-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => adjustQuantity(1)}
                    className="h-8 w-8 rounded-md border border-gray-300 text-lg font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                  <span className="text-xs text-gray-400">{product.stock} kilos Available</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </BuyerStoreLayout>
  );
}
