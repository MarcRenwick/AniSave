import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, ImageOff, Trash2 } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { SERVER_URL } from "../../services/api";

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, updateQuantity, removeFromCart } = useCart();
  const [selected, setSelected] = useState(() => new Set(items.map((i) => i.productId)));

  const toggleSelected = (productId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((i) => i.productId))
    );
  };

  const handleRemove = (productId) => {
    removeFromCart(productId);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const selectedItems = items.filter((i) => selected.has(i.productId));

  const handleProceedToCheckout = () => {
    navigate("/buyer/checkout", { state: { items: selectedItems, fromCart: true } });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex items-center gap-4 bg-[#2f8f66] px-6 py-5 text-white">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center text-xl font-semibold">Shopping Cart</h1>
        <Link
          to="/buyer/orders"
          className="flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 text-sm font-semibold hover:bg-black/30"
        >
          <ClipboardList className="h-4 w-4" />
          My Orders
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-base text-gray-500">Your cart is empty.</p>
          <Link
            to="/buyer/home"
            className="mt-4 inline-block rounded-md bg-[#2f8f66] px-6 py-2.5 text-base font-semibold text-white hover:bg-[#267a56]"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl bg-white">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-5 border-b border-gray-200 px-6 py-5"
            >
              <input
                type="checkbox"
                checked={selected.has(item.productId)}
                onChange={() => toggleSelected(item.productId)}
                className="h-6 w-6 shrink-0 accent-[#2f8f66]"
              />

              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-50 text-gray-300">
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
                <p className="truncate text-lg font-semibold text-gray-900">{item.title}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Link to={`/buyer/products/${item.productId}`} className="hover:underline">
                    View Product
                  </Link>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.productId)}
                    className="flex items-center gap-1 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="shrink-0 text-center">
                <p className="mb-1.5 text-sm text-gray-400">Quantity</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="h-9 w-9 rounded-md border border-gray-300 text-lg text-gray-600 hover:bg-gray-50"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-base font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="h-9 w-9 rounded-md border border-gray-300 text-lg text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between px-6 py-5">
            <label className="flex items-center gap-2.5 text-base font-medium text-gray-700">
              <input
                type="checkbox"
                checked={selected.size === items.length}
                onChange={toggleSelectAll}
                className="h-6 w-6 accent-[#2f8f66]"
              />
              All
            </label>

            {user?.role === "buyer" ? (
              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={selectedItems.length === 0}
                className="rounded-full bg-[#2f8f66] px-8 py-3 text-base font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
              >
                Check Out ({selectedItems.length})
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-[#2f8f66] px-8 py-3 text-base font-semibold text-white hover:bg-[#267a56]"
              >
                Log in to checkout
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
