import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

function readStoredCart() {
  try {
    const stored = localStorage.getItem("anisave_cart");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);

  const persist = (next) => {
    localStorage.setItem("anisave_cart", JSON.stringify(next));
    setItems(next);
  };

  const addToCart = (product, quantity) => {
    const existing = items.find((i) => i.productId === product._id);
    const next = existing
      ? items.map((i) =>
          i.productId === product._id
            ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) }
            : i
        )
      : [
          ...items,
          {
            productId: product._id,
            title: product.title,
            price: product.price,
            image: product.image,
            stock: product.stock,
            farmerName: product.farmer?.farmName || product.farmer?.name,
            quantity,
          },
        ];
    persist(next);
  };

  const removeFromCart = (productId) => persist(items.filter((i) => i.productId !== productId));

  // Removes several items in one update - looping removeFromCart would only
  // keep the last removal, since each call reads the same stale `items`
  // closure from this render.
  const removeItems = (productIds) => {
    const ids = new Set(productIds);
    persist(items.filter((i) => !ids.has(i.productId)));
  };

  const updateQuantity = (productId, quantity) =>
    persist(
      items.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i
      )
    );

  const clearCart = () => persist([]);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, removeItems, updateQuantity, clearCart, count, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
