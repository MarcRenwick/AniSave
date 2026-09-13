import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ImageOff } from "lucide-react";
import BuyerStoreLayout from "../../layouts/BuyerStoreLayout";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { createOrder, SERVER_URL } from "../../services/api";

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, updateQuantity, removeFromCart, clearCart, total } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setError("");
    setCheckingOut(true);
    try {
      for (const item of items) {
        await createOrder(item.productId, item.quantity);
      }
      clearCart();
      navigate("/buyer/marketplace");
    } catch (err) {
      setError(err.response?.data?.message || "Could not complete checkout. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <BuyerStoreLayout onBack={() => navigate(-1)}>
      <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Your cart is empty.</p>
          <Link
            to="/buyer/marketplace"
            className="mt-4 inline-block rounded-md bg-[#2f8f66] px-5 py-2 text-sm font-semibold text-white hover:bg-[#267a56]"
          >
            Browse the Marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-4 border-b border-gray-100 p-4 last:border-b-0">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-gray-300">
                  {item.image ? (
                    <img
                      src={`${SERVER_URL}${item.image}`}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="h-6 w-6" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500">₱{item.price} per kilo</p>
                  {item.farmerName && <p className="text-xs text-gray-400">{item.farmerName}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="h-7 w-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="h-7 w-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>

                <p className="w-20 shrink-0 text-right font-semibold text-gray-900">
                  ₱{item.price * item.quantity}
                </p>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-xl font-bold text-gray-900">₱{total}</span>
          </div>

          {user?.role === "buyer" ? (
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full rounded-md bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {checkingOut ? "Placing Orders..." : "Checkout"}
            </button>
          ) : (
            <Link
              to="/login"
              className="block w-full rounded-md bg-red-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Log in as a buyer to checkout
            </Link>
          )}
        </div>
      )}
    </BuyerStoreLayout>
  );
}
