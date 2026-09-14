import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Package, ImageOff, Star, ShoppingBasket } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import AddToCartModal from "../../components/buyer/AddToCartModal";
import CheckoutModal from "../../components/buyer/CheckoutModal";
import { getProduct, SERVER_URL } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buyMessage, setBuyMessage] = useState("");
  const [showAddToCart, setShowAddToCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then(({ data }) => setProduct(data))
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirmAddToCart = (qty) => {
    addToCart(product, qty);
    setShowAddToCart(false);
    setBuyMessage(`Added ${qty}kg to cart!`);
  };

  const handleProceedToCheckout = (qty) => {
    setShowCheckout(false);
    navigate("/buyer/checkout", {
      state: {
        items: [
          {
            productId: product._id,
            title: product.title,
            price: product.price,
            image: product.image,
            farmerId: product.farmer?._id,
            farmerName: product.farmer?.farmName || product.farmer?.name || "Unknown Farmer",
            location: product.location || product.farmer?.location || "Address not set",
            quantity: qty,
          },
        ],
        fromCart: false,
      },
    });
  };

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

            {user?.role === "buyer" ? (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddToCart(true)}
                  disabled={product.stock === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-[#2f8f66] py-3 text-sm font-semibold text-[#2f8f66] transition hover:bg-green-50 disabled:opacity-60"
                >
                  <ShoppingBasket className="h-4 w-4" />
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckout(true)}
                  disabled={product.stock === 0}
                  className="flex-1 rounded-md bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {product.stock === 0 ? "Out of Stock" : "Buy Now"}
                </button>
              </div>
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
              <Star className={`h-4 w-4 ${product.ratingCount > 0 ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
              {product.ratingCount > 0
                ? `${product.rating.toFixed(1)} (${product.ratingCount} rating${product.ratingCount === 1 ? "" : "s"})`
                : "No ratings yet"}{" "}
              · Sold {product.sold || 0}
            </p>

            <div className="mt-4 rounded-md bg-[#2f8f66] px-4 py-2 text-lg font-semibold text-white">
              ₱{product.price} per kilo
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Sold by</dt>
                <dd className="font-medium text-gray-900">
                  {product.farmer?.farmName || product.farmer?.name || "Unknown farmer"}
                </dd>
              </div>
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
                <dt className="text-gray-500">Available Stock</dt>
                <dd className="font-medium text-gray-900">{product.stock} kilos</dd>
              </div>
            </dl>
          </div>
        </div>
        )}
      </div>

      {showAddToCart && product && (
        <AddToCartModal
          product={product}
          onClose={() => setShowAddToCart(false)}
          onConfirm={handleConfirmAddToCart}
        />
      )}

      {showCheckout && product && (
        <CheckoutModal
          product={product}
          onClose={() => setShowCheckout(false)}
          onConfirm={handleProceedToCheckout}
        />
      )}
    </BuyerLayout>
  );
}
