import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, X } from "lucide-react";
import { createProduct, getProduct, updateProduct, SERVER_URL } from "../../services/api";
import { productImages } from "../../utils/productImages";

const MAX_PHOTOS = 5;

const emptyForm = {
  title: "",
  stock: "",
  location: "",
  price: "",
  category: "vegetable",
  productType: "sale",
  description: "",
};

const inputClass =
  "mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

function Required() {
  return <span className="text-red-600">*</span>;
}

function RadioGroup({ legend, name, value, options, onChange }) {
  return (
    <fieldset>
      <legend className="font-medium text-gray-900">
        {legend}
        <Required />
      </legend>
      <div className="mt-2 flex flex-wrap gap-x-10 gap-y-2">
        {options.map(([optionValue, label]) => (
          <label key={optionValue} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={onChange}
              className="h-4 w-4 accent-[#2f8f66]"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function FarmerProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  // Each slot is empty, a photo the product already has, or a newly picked file.
  const [slots, setSlots] = useState(() => Array(MAX_PHOTOS).fill(null));
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputs = useRef([]);

  useEffect(() => {
    if (!isEdit) return;
    getProduct(id)
      .then(({ data }) => {
        setForm({
          title: data.title,
          stock: data.stock,
          location: data.location || "",
          price: data.price,
          category: data.category,
          productType: data.productType || "sale",
          description: data.description || "",
        });
        const existing = productImages(data)
          .slice(0, MAX_PHOTOS)
          .map((path) => ({ kind: "existing", path }));
        setSlots([...existing, ...Array(MAX_PHOTOS - existing.length).fill(null)]);
      })
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const setSlot = (index, value) => {
    const previous = slots[index];
    if (previous?.kind === "new") URL.revokeObjectURL(previous.preview);
    setSlots((prev) => prev.map((slot, i) => (i === index ? value : slot)));
  };

  const handlePhoto = (index, e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setSlot(index, { kind: "new", file, preview: URL.createObjectURL(file) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const photos = slots.filter(Boolean);
    if (photos.length === 0) {
      setError("Add at least one photo of the product.");
      return;
    }

    const data = new FormData();
    Object.keys(emptyForm).forEach((key) => data.append(key, form[key]));
    photos.forEach((photo) => {
      if (photo.kind === "new") data.append("images", photo.file);
    });
    if (isEdit) {
      data.append(
        "imageOrder",
        JSON.stringify(photos.map((photo) => (photo.kind === "new" ? "new" : photo.path)))
      );
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateProduct(id, data);
        navigate(`/farmer/products/${id}`);
      } else {
        const { data: created } = await createProduct(data);
        navigate("/farmer/products", { state: { justAddedId: created._id } });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this product. Please try again.");
      setSubmitting(false);
    }
  };

  const coverIndex = slots.findIndex(Boolean);

  return (
    <div className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 pr-6 text-center text-xl font-semibold">
          {isEdit ? "Edit Product" : "Add New Product"}
        </h1>
      </div>

      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        {loading ? (
          <p className="text-sm text-gray-600">Loading...</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid gap-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8 md:grid-cols-[auto_1fr]"
          >
            <div>
              <p className="text-lg font-semibold text-gray-900">
                Add photos
                <Required />
              </p>
              <p className="text-xs text-gray-500">Up to {MAX_PHOTOS}. The first one is the cover.</p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                {slots.map((slot, i) => (
                  <div key={i} className="relative w-fit">
                    <button
                      type="button"
                      onClick={() => fileInputs.current[i]?.click()}
                      aria-label={slot ? `Replace photo ${i + 1}` : `Upload photo ${i + 1}`}
                      className="flex h-24 w-24 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border-2 border-dashed border-gray-400 bg-gray-50 text-gray-500 hover:border-[#2f8f66]"
                    >
                      {slot ? (
                        <img
                          src={slot.kind === "new" ? slot.preview : `${SERVER_URL}${slot.path}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <>
                          <Camera className="h-6 w-6" />
                          <span className="text-[10px]">Upload a photo</span>
                        </>
                      )}
                    </button>

                    {i === coverIndex && (
                      <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-[#2f8f66] px-1.5 text-[10px] font-semibold text-white">
                        Cover
                      </span>
                    )}

                    {slot && (
                      <button
                        type="button"
                        onClick={() => setSlot(i, null)}
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute -right-2 -top-2 rounded-full bg-red-600 p-0.5 text-white shadow"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <input
                      ref={(el) => {
                        fileInputs.current[i] = el;
                      }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhoto(i, e)}
                      className="hidden"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

              <div>
                <label htmlFor="title" className="font-medium text-gray-900">
                  Title
                  <Required />
                </label>
                <input id="title" name="title" required value={form.title} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label htmlFor="stock" className="font-medium text-gray-900">
                  Available Quantity/Kilos
                  <Required />
                </label>
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  required
                  value={form.stock}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="location" className="font-medium text-gray-900">
                  Address
                  <Required />
                </label>
                <input
                  id="location"
                  name="location"
                  required
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Brgy. Bagong Bayan, Dagupan City Pangasinan"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="price" className="font-medium text-gray-900">
                  Price
                  <Required />
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  required
                  value={form.price}
                  onChange={handleChange}
                  placeholder="₱ per kilo"
                  className={inputClass}
                />
              </div>

              <RadioGroup
                legend="Category"
                name="category"
                value={form.category}
                options={[
                  ["vegetable", "Vegetable"],
                  ["fruit", "Fruit"],
                ]}
                onChange={handleChange}
              />

              <div>
                <RadioGroup
                  legend="Product Type"
                  name="productType"
                  value={form.productType}
                  options={[
                    ["sale", "For Sale"],
                    ["preorder", "For Pre-Order"],
                  ]}
                  onChange={handleChange}
                />
                {form.productType === "preorder" && (
                  <p className="mt-1.5 text-xs text-amber-700">
                    Buyers can order this ahead of time. Stock is taken as you accept each pre-order.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="font-medium text-gray-900">
                  Product Description
                  <Required />
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  required
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe your product - freshness, flavor, best uses, etc."
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 rounded-md border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-md bg-[#2f8f66] py-2.5 text-sm font-semibold text-white hover:bg-[#267a56] disabled:opacity-60"
                >
                  {submitting ? "Saving..." : isEdit ? "Save" : "Publish"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
