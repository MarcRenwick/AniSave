import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, X } from "lucide-react";
import { createProduct, getProduct, updateProduct, SERVER_URL } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { productImages } from "../../utils/productImages";

const MAX_PHOTOS = 5;

const emptyForm = {
  title: "",
  stock: "",
  price: "",
  salePrice: "",
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
  const { user } = useAuth();

  const [form, setForm] = useState(emptyForm);
  // Photos in display order - either ones the product already has, or files
  // just picked. The first is the cover.
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    getProduct(id)
      .then(({ data }) => {
        setForm({
          title: data.title,
          stock: data.stock,
          price: data.price,
          salePrice: data.salePrice ?? "",
          category: data.category,
          productType: data.productType || "sale",
          description: data.description || "",
        });
        setPhotos(
          productImages(data)
            .slice(0, MAX_PHOTOS)
            .map((path) => ({ kind: "existing", path }))
        );
      })
      .catch(() => setError("Could not load this product."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAddPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const room = MAX_PHOTOS - photos.length;
    setError(
      files.length > room
        ? `Only ${room} more photo${room === 1 ? "" : "s"} could be added - ${MAX_PHOTOS} is the maximum.`
        : ""
    );
    setPhotos((prev) => [
      ...prev,
      ...files.slice(0, room).map((file) => ({ kind: "new", file, preview: URL.createObjectURL(file) })),
    ]);
  };

  const removePhoto = (index) => {
    const photo = photos[index];
    if (photo?.kind === "new") URL.revokeObjectURL(photo.preview);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (photos.length === 0) {
      setError("Add at least one photo of the product.");
      return;
    }
    if (form.salePrice !== "" && Number(form.salePrice) >= Number(form.price)) {
      setError("Sale price must be less than the regular price.");
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
              <p className="text-xs text-gray-500">
                Pick several at once - up to {MAX_PHOTOS}. The first is the cover.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                {photos.map((photo, i) => (
                  <div key={photo.kind === "new" ? photo.preview : photo.path} className="relative w-fit">
                    <div className="h-24 w-24 overflow-hidden rounded-md border border-gray-300 bg-gray-50">
                      <img
                        src={photo.kind === "new" ? photo.preview : `${SERVER_URL}${photo.path}`}
                        alt={`Product photo ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {i === 0 && (
                      <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-[#2f8f66] px-1.5 text-[10px] font-semibold text-white">
                        Cover
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute -right-2 -top-2 rounded-full bg-red-600 p-0.5 text-white shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-gray-400 bg-gray-50 text-gray-500 hover:border-[#2f8f66]"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-[10px]">Add photos</span>
                  </button>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddPhotos}
                className="hidden"
              />
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

              <div>
                <label htmlFor="salePrice" className="font-medium text-gray-900">
                  Flash Sale Price{" "}
                  <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="salePrice"
                  name="salePrice"
                  type="number"
                  min="0"
                  value={form.salePrice}
                  onChange={handleChange}
                  placeholder="Leave blank for no sale"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Set a lower price to discount this listing - good for old stock that hasn&apos;t
                  sold. It stays discounted until you clear this or edit it back up.
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-gray-50 px-3 py-2.5 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2f8f66]" />
                <p className="text-gray-600">
                  Pickup address:{" "}
                  <span className="font-medium text-gray-900">
                    {user?.location || "not set yet - add it in Edit Profile"}
                  </span>
                  <br />
                  <span className="text-xs">Taken from your registered address, for every listing.</span>
                </p>
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
