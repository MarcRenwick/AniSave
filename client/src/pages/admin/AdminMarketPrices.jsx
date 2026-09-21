import { useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import AdminTopBar from "../../components/admin/AdminTopBar";
import Modal from "../../components/Modal";
import {
  archiveMarketPrice,
  createMarketPrice,
  deleteMarketPrice,
  getMarketPrices,
  getPriceMunicipalities,
  getSupportedCrops,
  updateMarketPrice,
} from "../../services/api";

// Kilos are priced in pesos and centavos; nothing else is accepted as it is
// typed, so what is on screen is always what gets sent.
const priceOnly = (value) => {
  const [whole, ...rest] = value.replace(/[^0-9.]/g, "").split(".");
  return rest.length > 0 ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};

const peso = (amount) => `₱${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" });
const asInputDate = (date) => new Date(date).toISOString().slice(0, 10);
const today = () => asInputDate(new Date());

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";
const labelClass = "block text-sm font-medium text-gray-700";

const blankDraft = { crop: "", cityCode: "", pricePerKilo: "", recordedAt: today(), source: "" };

// Add or edit one record. Both the product and the municipality are chosen
// from lists the server supplies - the products the Recommended Price feature
// supports, and the municipalities and cities of the service area - so a price
// can never be recorded against something no farmer could be matched to.
function PriceForm({ record, crops, cities, onClose, onSaved }) {
  const [draft, setDraft] = useState(() =>
    record
      ? {
          crop: record.crop?._id || "",
          cityCode: record.cityCode,
          pricePerKilo: String(record.pricePerKilo),
          recordedAt: asInputDate(record.recordedAt),
          source: record.source || "",
        }
      : blankDraft
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (name, value) => setDraft((prev) => ({ ...prev, [name]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!draft.crop || !draft.cityCode || draft.pricePerKilo === "") {
      setError("Choose a product and municipality, and enter a price per kilo.");
      return;
    }
    setSaving(true);
    try {
      const { data } = record
        ? await updateMarketPrice(record._id, draft)
        : await createMarketPrice(draft);
      onSaved(data, !record);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this record. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title={record ? "Edit Market Price" : "Add Market Price"} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <div>
          <label htmlFor="mp-crop" className={labelClass}>
            Product
          </label>
          <select
            id="mp-crop"
            required
            value={draft.crop}
            onChange={(e) => set("crop", e.target.value)}
            className={inputClass}
          >
            <option value="">Select product</option>
            {crops.map((crop) => (
              <option key={crop._id} value={crop._id}>
                {crop.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Only products the Recommended Price feature supports can be priced.
          </p>
        </div>

        <div>
          <label htmlFor="mp-city" className={labelClass}>
            Municipality / City
          </label>
          <select
            id="mp-city"
            required
            value={draft.cityCode}
            onChange={(e) => set("cityCode", e.target.value)}
            className={inputClass}
          >
            <option value="">Select municipality / city</option>
            {cities.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mp-price" className={labelClass}>
              Price per KG
            </label>
            <input
              id="mp-price"
              type="text"
              inputMode="decimal"
              required
              value={draft.pricePerKilo}
              onChange={(e) => set("pricePerKilo", priceOnly(e.target.value))}
              placeholder="₱ per kilo"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="mp-date" className={labelClass}>
              Date recorded
            </label>
            <input
              id="mp-date"
              type="date"
              required
              max={today()}
              value={draft.recordedAt}
              onChange={(e) => set("recordedAt", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="mp-source" className={labelClass}>
            Source <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="mp-source"
            value={draft.source}
            onChange={(e) => set("source", e.target.value)}
            placeholder="e.g. Dagupan public market monitoring"
            className={inputClass}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white transition hover:bg-[#287856] disabled:opacity-60"
          >
            {saving ? "Saving..." : record ? "Save changes" : "Add record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminMarketPrices() {
  const [records, setRecords] = useState([]);
  const [crops, setCrops] = useState([]);
  const [cities, setCities] = useState([]);
  const [province, setProvince] = useState("");
  // Which list the records on hand are of, so "still loading" is simply not
  // yet having the list that is being asked for.
  const [loadedFor, setLoadedFor] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showingArchived, setShowingArchived] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [editing, setEditing] = useState(null); // a record, or "new"
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  useEffect(() => {
    Promise.all([getSupportedCrops(), getPriceMunicipalities()])
      .then(([cropRes, areaRes]) => {
        setCrops(cropRes.data);
        setCities(areaRes.data.cities);
        setProvince(areaRes.data.province);
      })
      .catch(() => setError("Could not load the product and municipality lists. Is the server running?"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMarketPrices({ archived: showingArchived ? "true" : "false" })
      .then(({ data }) => {
        if (cancelled) return;
        setRecords(data);
        setLoadedFor(showingArchived);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load market prices. Is the server running?");
      });
    return () => {
      cancelled = true;
    };
  }, [showingArchived]);

  const loading = loadedFor !== showingArchived;

  const shown = useMemo(
    () => (cityFilter ? records.filter((r) => r.cityCode === cityFilter) : records),
    [records, cityFilter]
  );

  const afterSave = (saved, wasNew) => {
    setEditing(null);
    setNotice(
      `${saved.crop?.name} in ${saved.municipality} ${wasNew ? "recorded" : "updated"} at ${peso(saved.pricePerKilo)}/kg.`
    );
    // A record saved as archived belongs in the other list, not this one.
    setRecords((prev) => {
      const without = prev.filter((r) => r._id !== saved._id);
      return saved.archived === showingArchived
        ? [saved, ...without].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
        : without;
    });
  };

  const archive = async (record) => {
    try {
      await archiveMarketPrice(record._id);
      setRecords((prev) => prev.filter((r) => r._id !== record._id));
      setNotice(`${record.crop?.name} in ${record.municipality} archived. Farmers are no longer shown it.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not archive that record.");
    }
  };

  const restore = async (record) => {
    try {
      const { data } = await updateMarketPrice(record._id, { archived: false });
      setRecords((prev) => prev.filter((r) => r._id !== record._id));
      setNotice(`${data.crop?.name} in ${data.municipality} restored.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not restore that record.");
    }
  };

  const destroy = async () => {
    const record = confirmingDelete;
    setConfirmingDelete(null);
    try {
      await deleteMarketPrice(record._id);
      setRecords((prev) => prev.filter((r) => r._id !== record._id));
      setNotice(`${record.crop?.name} in ${record.municipality} deleted for good.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete that record.");
    }
  };

  return (
    <AdminLayout>
      <AdminTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Market Prices</h1>
        <p className="text-sm text-gray-500">
          What each crop goes for, by municipality. Farmers are shown the latest record for their own
          town as a suggested selling price.
        </p>
      </AdminTopBar>

      <div className="p-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowingArchived(false)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              showingArchived
                ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                : "bg-[#2f8f66] text-white"
            }`}
          >
            Current
          </button>
          <button
            type="button"
            onClick={() => setShowingArchived(true)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              showingArchived
                ? "bg-[#2f8f66] text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Archived
          </button>

          <select
            aria-label="Filter by municipality"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700"
          >
            <option value="">All municipalities{province ? ` in ${province}` : ""}</option>
            {cities.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setEditing("new")}
            className="ml-auto flex items-center gap-2 rounded-full bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#287856]"
          >
            <Plus className="h-4 w-4" /> Add market price
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-[#1f5c42]">{notice}</div>
        )}
        {error && <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-sm text-gray-600">Loading...</p>
          ) : shown.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-gray-900">
                {showingArchived ? "Nothing archived yet." : "No market prices recorded yet."}
              </p>
              {!showingArchived && (
                <p className="mt-1 text-sm text-gray-500">
                  Until a price is recorded here, farmers are told no recommendation is available for
                  their municipality - never a made-up figure.
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Municipality / City</th>
                  <th className="px-4 py-3 font-semibold">Price per KG</th>
                  <th className="px-4 py-3 font-semibold">Date recorded</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((record) => (
                  <tr key={record._id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {record.crop?.name || "Unknown product"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{record.municipality}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{peso(record.pricePerKilo)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(record.recordedAt)}</td>
                    <td className="px-4 py-3 text-gray-500">{record.source || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(record)}
                          aria-label={`Edit ${record.crop?.name} in ${record.municipality}`}
                          title="Edit"
                          className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {showingArchived ? (
                          <button
                            type="button"
                            onClick={() => restore(record)}
                            aria-label={`Restore ${record.crop?.name} in ${record.municipality}`}
                            title="Restore"
                            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#2f8f66]"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => archive(record)}
                            aria-label={`Archive ${record.crop?.name} in ${record.municipality}`}
                            title="Archive - stops being recommended, but is kept"
                            className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(record)}
                          aria-label={`Delete ${record.crop?.name} in ${record.municipality}`}
                          title="Delete for good"
                          className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <PriceForm
          record={editing === "new" ? null : editing}
          crops={crops}
          cities={cities}
          onClose={() => setEditing(null)}
          onSaved={afterSave}
        />
      )}

      {confirmingDelete && (
        <Modal title="Delete this record?" onClose={() => setConfirmingDelete(null)}>
          <p className="text-sm text-gray-600">
            {confirmingDelete.crop?.name} in {confirmingDelete.municipality},{" "}
            {peso(confirmingDelete.pricePerKilo)}/kg, recorded {formatDate(confirmingDelete.recordedAt)}.
            This can&apos;t be undone - archive it instead to keep the history.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmingDelete(null)}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={destroy}
              className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
