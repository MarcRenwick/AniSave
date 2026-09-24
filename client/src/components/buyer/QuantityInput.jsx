import { useState } from "react";

// The - / number / + control shared by the Add to Cart and Checkout dialogs.
//
// What's typed is kept as text, separate from the quantity itself, because a
// person changing "1" to "21" has to pass through an empty box (or "2") on the
// way. Forcing the box back to a valid number on every keystroke - which is
// what these dialogs used to do - snaps it straight back to 1 and makes
// typing a quantity impossible. So: the text is free while editing, `value`
// only ever holds the last valid quantity, and the text is tidied on blur.
//
// An empty box or a 0 is not tidied, though: it is wrong, and says so. It used
// to be turned into 1 on the way out, so asking for 0 kilos quietly ordered
// one. `onValidChange` lets the dialog turn its confirm button off until the
// box holds a real quantity - pass a setState function, which never changes
// identity between renders.
export default function QuantityInput({ value, onChange, max, onValidChange }) {
  const [text, setText] = useState(String(value));

  const typed = text.trim();
  const invalid = typed === "" || Number(typed) < 1;

  const clamp = (n) => Math.max(1, max === undefined ? n : Math.min(max, n));

  // Every path that changes the box also says whether what's in it counts as
  // a quantity, so the dialog never has to work it out from the text itself.
  const setDraft = (next, ok) => {
    setText(next);
    onValidChange?.(ok);
  };

  // Set both at once: used by the buttons, arrow keys and blur.
  const commit = (n) => {
    const next = clamp(n);
    setDraft(String(next), true);
    onChange(next);
  };

  const handleTyped = (e) => {
    // Digits only, and no leading zeros ("05" becomes "5").
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    const n = Number(digits);

    // Empty or 0: shown as typed, not treated as a quantity, and not silently
    // replaced by 1 either here or on the way out.
    if (digits === "" || n < 1) {
      setDraft(digits, false);
      return;
    }
    if (max !== undefined && n > max) {
      commit(max);
      return;
    }
    setDraft(digits, true);
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
    <>
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
          aria-invalid={invalid}
          value={text}
          onChange={handleTyped}
          onKeyDown={handleKeyDown}
          // Left with a real number: tidy it. Left empty or at 0: leave it be,
          // so what is wrong stays on screen to be corrected.
          onBlur={() => {
            if (!invalid) commit(Number(text));
          }}
          // Selecting it all means typing replaces the 1 instead of appending to it.
          onFocus={(e) => e.target.select()}
          className={`w-16 rounded-md border py-1.5 text-center text-xl font-semibold focus:outline-none focus:ring-1 ${
            invalid
              ? "border-red-400 text-red-600 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 text-gray-900 focus:border-[#2f8f66] focus:ring-[#2f8f66]"
          }`}
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

      {invalid && (
        <p role="alert" className="mt-2 text-center text-xs font-medium text-red-600">
          Enter at least 1 kilo.
        </p>
      )}
    </>
  );
}
