import { useState } from "react";

// The - / number / + control shared by the Add to Cart and Checkout dialogs.
//
// What's typed is kept as text, separate from the quantity itself, because a
// person changing "1" to "21" has to pass through an empty box (or "2") on the
// way. Forcing the box back to a valid number on every keystroke - which is
// what these dialogs used to do - snaps it straight back to 1 and makes
// typing a quantity impossible. So: the text is free while editing, `value`
// only ever holds the last valid quantity, and the text is tidied on blur.
export default function QuantityInput({ value, onChange, max }) {
  const [text, setText] = useState(String(value));

  const clamp = (n) => Math.max(1, max === undefined ? n : Math.min(max, n));

  // Set both at once: used by the buttons, arrow keys and blur.
  const commit = (n) => {
    const next = clamp(n);
    setText(String(next));
    onChange(next);
  };

  const handleTyped = (e) => {
    // Digits only, and no leading zeros ("05" becomes "5").
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    const n = Number(digits);

    // Empty or 0 is fine while typing - just don't call it the quantity yet.
    if (digits === "" || n < 1) {
      setText(digits);
      return;
    }
    if (max !== undefined && n > max) {
      commit(max);
      return;
    }
    setText(digits);
    onChange(n);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      commit(value + 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      commit(value - 1);
    }
  };

  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => commit(value - 1)}
        aria-label="Decrease quantity"
        className="h-10 w-10 rounded-md border border-gray-300 text-lg font-semibold text-gray-600 hover:bg-gray-50"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        aria-label="Quantity in kilos"
        value={text}
        onChange={handleTyped}
        onKeyDown={handleKeyDown}
        // Emptied out (or 0) and left: go back to the last real quantity.
        onBlur={() => commit(text === "" ? value : Number(text))}
        // Selecting it all means typing replaces the 1 instead of appending to it.
        onFocus={(e) => e.target.select()}
        className="w-16 rounded-md border border-gray-300 py-1.5 text-center text-xl font-semibold text-gray-900 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
      />
      <button
        type="button"
        onClick={() => commit(value + 1)}
        aria-label="Increase quantity"
        className="h-10 w-10 rounded-md border border-gray-300 text-lg font-semibold text-gray-600 hover:bg-gray-50"
      >
        +
      </button>
    </div>
  );
}
