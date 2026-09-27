// A segmented control: the chosen option filled in AniSave green, so which one
// is on is never in doubt.
export default function Segmented({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div role="group" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
        {options.map(({ key, label: text, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={value === key}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              value === key ? "bg-[#2f8f66] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
