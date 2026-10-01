import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ClipboardList, ImageOff, Trash2 } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { SERVER_URL } from "../../services/api";
import ProductImage from "../../components/products/ProductImage";
import RemoveCartItemModal from "../../components/buyer/RemoveCartItemModal";
import useScrollReveal from "../../hooks/useScrollReveal";
import useHarvestTheme from "../../theme/useHarvestTheme";
import { PhotoBand, PhotoEmptyState } from "../../components/buyer/BuyerVisuals";
import { BUYER_PHOTOS } from "../../utils/buyerPhotos";
import { EASE } from "../../theme/harvest";
import { amountOf, perUnit, totalAmounts, unitOf, unitWord, unitWords } from "../../utils/units";

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
        aria-label={`One ${unitWord(unitOf(item))} less of ${item.title}`}
        className="h-9 w-9 rounded-full border border-gray-300 bg-paper text-lg leading-none text-gray-700 transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${unitWords(unitOf(item))} of ${item.title}`}
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
        className="h-9 w-14 rounded-full border border-gray-300 bg-paper text-center text-sm font-semibold text-gray-900 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15"
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={item.quantity >= item.stock}
        aria-label={`One ${unitWord(unitOf(item))} more of ${item.title}`}
        className="h-9 w-9 rounded-full border border-gray-300 bg-paper text-lg leading-none text-gray-700 transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
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
  // The row whose bin was pressed, while the buyer is asked to confirm.
  const [removing, setRemoving] = useState(null);
  const rootRef = useRef(null);
  useScrollReveal(rootRef);
  useHarvestTheme();

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
  // Kilos and trays each added up on their own.
  const totalAmount = totalAmounts(selectedItems);

  const handleProceedToCheckout = () => {
    navigate("/buyer/checkout", { state: { items: selectedItems, fromCart: true } });
  };

  const headCell = "px-4 py-4 text-center text-sm font-bold uppercase tracking-[0.08em] text-gray-600";
  // A row as it arrives, and as it goes when removed.
  const rowMotion = {
    layout: "position",
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -24, transition: { duration: 0.22 } },
    transition: { duration: 0.35, ease: EASE },
  };

  return (
    <div ref={rootRef} className="buyer-field harvest-grain min-h-screen bg-cream">
      {/* The header: woven baskets of carrots on an earthy shade. */}
      <PhotoBand
        photo={BUYER_PHOTOS.baskets}
        eyebrow="Your basket"
        title="Shopping Cart"
        onBack={() => navigate(-1)}
        testId="cart-header"
        right={
          <Link
            to="/buyer/orders"
            className="flex shrink-0 items-center gap-2 rounded-full bg-cream/10 px-4 py-2 text-sm font-semibold ring-1 ring-cream/25 backdrop-blur-sm transition-colors hover:bg-cream/20"
          >
            <ClipboardList className="h-4 w-4" />
            My Orders
          </Link>
        }
      />

      {items.length === 0 ? (
        <PhotoEmptyState
          photo={BUYER_PHOTOS.emptyTray}
          title="Your cart is empty."
          action={
            <Link
              to="/buyer/home"
              className="inline-block rounded-full bg-brand px-6 py-2.5 text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgb(31_81_48/0.8)] transition-colors hover:bg-brand-hover"
            >
              Browse Products
            </Link>
          }
        >
          Fresh produce you add from the market waits here until you check out.
        </PhotoEmptyState>
      ) : (
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <h2 className="font-display text-3xl font-semibold text-gray-900" data-reveal>
            Cart
          </h2>

          <div
            className="mt-4 overflow-hidden rounded-[1.75rem] border border-gray-200 bg-paper shadow-soft"
            data-reveal
          >
            <table className="w-full max-md:hidden">
              <thead className="bg-sand">
                <tr>
                  <th scope="col" className="w-14 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selected.size === items.length}
                      onChange={toggleSelectAll}
                      aria-label="Select every item in the cart"
                      className="h-5 w-5 accent-brand"
                    />
                  </th>
                  <th scope="col" className="px-2 py-4 text-left text-sm font-bold uppercase tracking-[0.08em] text-gray-600">
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
                <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.tr key={item.productId} {...rowMotion} className="border-b border-gray-200 transition-colors last:border-0 hover:bg-cream/70">
                    <td className="px-4 py-5 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(item.productId)}
                        onChange={() => toggleSelected(item.productId)}
                        aria-label={`Include ${item.title} in the checkout`}
                        className="h-5 w-5 accent-brand"
                      />
                    </td>

                    <td className="px-2 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sand/70 p-1">
                          {item.image ? (
                            <ProductImage
                              src={`${SERVER_URL}${item.image}`}
                              alt={item.title}
                              className="h-full w-full rounded-xl object-contain"
                            />
                          ) : (
                            <ImageOff className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/buyer/products/${item.productId}`}
                            className="font-display text-lg font-semibold text-gray-900 hover:text-brand hover:underline"
                          >
                            {item.title}
                          </Link>
                          <p className="text-xs text-gray-500">{amountOf(item.stock, unitOf(item))} in stock</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <span className="text-base font-semibold text-gray-900">
                        {peso(item.price)}
                      </span>
                      <span className="text-sm text-gray-500"> {perUnit(unitOf(item))}</span>
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

                    <td className="px-4 py-5 text-center text-base font-bold text-forest-700">
                      {peso(item.price * item.quantity)}
                    </td>

                    <td className="px-4 py-5 text-center">
                      <button
                        type="button"
                        onClick={() => setRemoving(item)}
                        aria-label={`Remove ${item.title} from the cart`}
                        className="rounded-full p-2 text-clay-500 transition-colors hover:bg-tomato-50 hover:text-tomato-600"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Phones: each item is a card - the table's six columns don't fit. */}
            <div className="md:hidden" data-testid="cart-cards">
              <label className="flex items-center gap-3 bg-sand px-4 py-3 text-base font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.size === items.length}
                  onChange={toggleSelectAll}
                  aria-label="Select every item in the cart"
                  className="h-5 w-5 accent-brand"
                />
                Select all
              </label>
              <ul className="divide-y divide-gray-200">
                <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li key={item.productId} {...rowMotion} className="flex gap-3 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(item.productId)}
                      onChange={() => toggleSelected(item.productId)}
                      aria-label={`Include ${item.title} in the checkout`}
                      className="mt-5 h-5 w-5 shrink-0 accent-brand"
                    />
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sand/70 p-1">
                      {item.image ? (
                        <ProductImage
                          src={`${SERVER_URL}${item.image}`}
                          alt={item.title}
                          className="h-full w-full rounded-xl object-contain"
                        />
                      ) : (
                        <ImageOff className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/buyer/products/${item.productId}`}
                            className="block truncate font-display text-lg font-semibold text-gray-900 hover:text-brand hover:underline"
                          >
                            {item.title}
                          </Link>
                          <p className="text-xs text-gray-500">{amountOf(item.stock, unitOf(item))} in stock</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRemoving(item)}
                          aria-label={`Remove ${item.title} from the cart`}
                          className="shrink-0 rounded-full p-1.5 text-clay-500 transition-colors hover:bg-tomato-50 hover:text-tomato-600"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="mt-1 text-sm">
                        <span className="font-semibold text-gray-900">{peso(item.price)}</span>
                        {item.originalPrice > item.price && (
                          <span className="ml-2 text-xs text-gray-400 line-through">{peso(item.originalPrice)}</span>
                        )}
                        <span className="text-gray-500"> {perUnit(unitOf(item))}</span>
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <QuantityBox
                          item={item}
                          onChange={(quantity) => updateQuantity(item.productId, quantity)}
                        />
                        <p className="text-base font-bold text-forest-700">{peso(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </motion.li>
                ))}
                </AnimatePresence>
              </ul>
            </div>
          </div>

          <div
            className="mt-6 flex flex-col gap-5 rounded-[1.75rem] bg-[linear-gradient(110deg,#0f2418,#1f5130)] p-6 text-cream shadow-lift sm:flex-row sm:items-center sm:justify-between"
            data-reveal
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">Total expense</p>
              <motion.p
                key={totalExpense}
                initial={{ opacity: 0.4, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="mt-1 font-display text-4xl font-semibold text-cream"
              >
                {peso(totalExpense)}
              </motion.p>
              <p className="mt-1 text-xs text-cream/75">
                {selectedItems.length} of {items.length} item{items.length === 1 ? "" : "s"} ticked ·{" "}
                {totalAmount}
              </p>
            </div>

            {user?.role === "buyer" ? (
              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={selectedItems.length === 0}
                className="rounded-full bg-gold-400 px-8 py-3 text-base font-semibold text-night shadow-glow-gold transition-colors hover:bg-gold-300 disabled:opacity-60 disabled:shadow-none"
              >
                Check Out ({selectedItems.length})
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-gold-400 px-8 py-3 text-center text-base font-semibold text-night shadow-glow-gold transition-colors hover:bg-gold-300"
              >
                Log in to checkout
              </Link>
            )}
          </div>
        </div>
      )}

      {removing && (
        <RemoveCartItemModal
          item={removing}
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            handleRemove(removing.productId);
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
}
