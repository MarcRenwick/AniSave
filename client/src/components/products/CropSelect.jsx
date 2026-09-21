import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { searchCrops } from "../../services/api";

// What a crop is: the catalogue row, not the words on screen. The form holds
// `value` as { _id, name, ... } and sends only the id, so a listing can never
// name produce the rest of the app doesn't know about.
//
// Typing filters the catalogue rather than being accepted as-is: there is no
// way to submit a name that isn't in the list, which is the point of it.
export default function CropSelect({
  value,
  onChange,
  id,
  required = false,
  disabled = false,
  placeholder = "Search for a product - mango, ampalaya, camote...",
  inputClass = "",
  supportedOnly = false,
}) {
  const fallbackId = useId();
  const fieldId = id || fallbackId;
  const listId = `${fieldId}-list`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  // Clicking anywhere else closes the list and forgets what was half-typed,
  // so the box never shows text that isn't the chosen product.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // One request per pause in typing, and a stale reply is dropped rather than
  // overwriting a newer one.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      searchCrops(query.trim(), supportedOnly ? { supportedOnly: true } : {})
        .then(({ data }) => {
          if (cancelled) return;
          setResults(data);
          setActive(0);
          setFailed(false);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, supportedOnly]);

  const choose = (crop) => {
    onChange(crop);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return Math.max(0, Math.min(results.length - 1, next));
      });
    } else if (e.key === "Enter") {
      // Never submits the form from this box - Enter picks, it doesn't post.
      e.preventDefault();
      if (open && results[active]) choose(results[active]);
      else setOpen(true);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id={fieldId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          // Shows the chosen product until the farmer starts typing a new one.
          value={open ? query : value?.name || ""}
          placeholder={value ? value.name : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`${inputClass} pl-9 pr-16`}
        />
        {/* The field itself is never what's submitted - this is, so the form
            can require a product without accepting typed text as one. */}
        <input type="hidden" name="crop" value={value?._id || ""} required={required} />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setQuery("");
                setOpen(true);
              }}
              aria-label="Clear the chosen product"
              className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {failed && <li className="px-3 py-2 text-sm text-red-600">Couldn&apos;t load the product list.</li>}
          {!failed && loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">Searching...</li>
          )}
          {!failed && !loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">
              No product matches &ldquo;{query.trim()}&rdquo;. Try another name.
            </li>
          )}
          {results.map((crop, i) => (
            <li key={crop._id} role="option" aria-selected={value?._id === crop._id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(crop)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                  i === active ? "bg-green-50" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{crop.name}</span>
                  <span className="block text-xs capitalize text-gray-500">{crop.group}</span>
                </span>
                {value?._id === crop._id && <Check className="h-4 w-4 shrink-0 text-[#2f8f66]" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
