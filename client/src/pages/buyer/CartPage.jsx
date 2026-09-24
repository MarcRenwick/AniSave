import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, ImageOff, Trash2 } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { SERVER_URL } from "../../services/api";
import ProductImage from "../../components/products/ProductImage";
import useScrollReveal from "../../hooks/useScrollReveal";

const peso = (amount) => `₱ ${Number(amount || 0).toLocaleString()}`;

// Kilos are whole numbers, and the box refuses anything else as it is typed.
const digitsOnly = (value) => value.replace(/[^0-9]/g, "");

// How many kilos of one listing. Typed as well as stepped, because a buyer
// ordering 40kg shouldn't have to press + forty times.
//
// While the box is being typed in it shows what is being typed; the rest of
// the time it shows the quantity the cart actually holds. That way a
// half-finished number is never written to the cart, and a number over what
// the farmer has is pulled back to the stock on the way in.
function QuantityBox({ item, onChange }) {
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);

  // Read from the field itself, not from `draft`. They hold the same thing a
  // moment later, but a blur that lands in the same tick as the last
  // keystroke would otherwise commit the number as it was one character ago.
  const commit = (raw) => {
    setTyping(false);
    const wanted = Number(digitsOnly(raw));
    if (Number.isFinite(wanted) && wanted > 0) onChange(wanted);
  };

  const step = (by) => {
    setTyping(false);
    onChange(item.quantity + by);
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={item.quantity <= 1}
        aria-label={`One kilo less of ${item.title}`}
        className="h-8 w-8 rounded-md border border-gray-300 text-lg leading-none text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`Kilos of ${item.title}`}
        value={typing ? draft : String(item.quantity)}
        onChange={(e) => {
          setTyping(true);
          setDraft(digitsOnly(e.target.value));
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(e.target.value);
          }
        }}
        className="h-9 w-14 rounded-md border border-gray-400 text-center text-sm text-gray-900 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={item.quantity >= item.stock}
        aria-label={`One kilo more of ${item.title}`}
        className="h-8 w-8 rounded-md border border-gray-300 text-lg leading-none text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, updateQuantity, removeFromCart } = useCart();
  // Nothing is ticked on arrival. The cart is where a basket is looked over,
  // not a checkout queue: opening it used to tick everything in it, so the
  // total and the Check Out button spoke for items the buyer had not chosen
  // yet and had to be unticked one by one.
  const [selected, setSelected] = useState(() => new Set());
  const rootRef = useRef(null);
  useScrollReveal(rootRef);

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
  // What checking out now would cost - the ticked rows only, since those are
  // the ones that go to the checkout.
  const totalExpense = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalKilos = selectedItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleProceedToCheckout = () => {
    navigate("/buyer/checkout", { state: { items: selectedItems, fromCart: true } });
  };

  const headCell = "px-4 py-4 text-center text-base font-bold text-gray-800";

  return (
    <div ref={rootRef} className="min-h-screen bg-gray-50">
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
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h2 className="text-2xl font-bold text-[#2f8f66]" data-reveal>
            Cart
          </h2>

          <div
            className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            data-reveal
          >
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th scope="col" className="w-14 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selected.size === items.length}
                      onChange={toggleSelectAll}
                      aria-label="Select every item in the cart"
                      className="h-5 w-5 accent-[#2f8f66]"
                    />
                  </th>
                  <th scope="col" className="px-2 py-4 text-left text-base font-bold text-gray-800">
                    Products
                  </th>
                  <th scope="col" className={headCell}>
                    Price
                  </th>
                  <th scope="col" className={headCell}>
                    Quantity
                  </th>
                  <th scope="col" className={headCell}>
                    Total
                  </th>
                  <th scope="col" className={headCell}>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.productId} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-5 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(item.productId)}
                        onChange={() => toggleSelected(item.productId)}
                        aria-label={`Include ${item.title} in the checkout`}
                        className="h-5 w-5 accent-[#2f8f66]"
                      />
                    </td>

                    <td className="px-2 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center">
                          {item.image ? (
                            <ProductImage
                              src={`${SERVER_URL}${item.image}`}
                              alt={item.title}
                              className="h-full w-full rounded-md object-contain"
                            />
                          ) : (
                            <ImageOff className="h-6 w-6 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/buyer/products/${item.productId}`}
                            className="text-base font-medium text-gray-900 hover:underline"
                          >
                            {item.title}
                          </Link>
                          <p className="text-xs text-gray-500">{item.stock} kg in stock</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <span className="text-base font-semibold text-gray-900">
                        {peso(item.price)}
                      </span>
                      {/* A listing bought on Flash Sale still says what it
                          normally goes for. */}
                      {item.originalPrice > item.price && (
                        <span className="ml-2 text-xs text-gray-400 line-through">
                          {peso(item.originalPrice)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-5">
                      <QuantityBox
                        item={item}
                        onChange={(quantity) => updateQuantity(item.productId, quantity)}
                      />
                    </td>

                    <td className="px-4 py-5 text-center text-base font-semibold text-gray-900">
                      {peso(item.price * item.quantity)}
                    </td>

                    <td className="px-4 py-5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemove(item.productId)}
                        aria-label={`Remove ${item.title} from the cart`}
                        className="text-orange-500 transition hover:text-red-600"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="mt-6 flex flex-col gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            data-reveal
          >
            <div>
              <p className="text-sm text-gray-500">Total expense</p>
              <p className="text-3xl font-bold text-[#2f8f66]">{peso(totalExpense)}</p>
              <p className="mt-1 text-xs text-gray-500">
                {selectedItems.length} of {items.length} item{items.length === 1 ? "" : "s"} ticked ·{" "}
                {totalKilos} kg
              </p>
            </div>

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
                className="rounded-full bg-[#2f8f66] px-8 py-3 text-center text-base font-semibold text-white hover:bg-[#267a56]"
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
