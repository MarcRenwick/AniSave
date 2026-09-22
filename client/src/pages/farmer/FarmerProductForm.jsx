import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, ImageOff, Info, MapPin, Tag, X } from "lucide-react";
import {
  createProduct,
  getPriceRecommendation,
  getProduct,
  updateProduct,
  SERVER_URL,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { productImages } from "../../utils/productImages";
import CropSelect from "../../components/products/CropSelect";
import PriceTag from "../../components/products/PriceTag";
import Avatar from "../../components/Avatar";

const MAX_PHOTOS = 5;

// A browser's own number box still accepts "100e+", "1e5" or a stray "-", and
// then hands back an empty string - so the field looks filled while the form
// holds nothing, and Publish complains about a box that plainly has something
// in it. These are ordinary text boxes that refuse anything but a number as it
// is typed, so what is on screen is always what gets sent.
const digitsOnly = (value) => value.replace(/[^0-9]/g, "");

// Prices may have centavos; kilos are whole.
const priceOnly = (value) => {
  const [whole, ...rest] = value.replace(/[^0-9.]/g, "").split(".");
  return rest.length > 0 ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
};

const CLEAN = { stock: digitsOnly, price: priceOnly, salePrice: priceOnly };

// Only whole pesos are ever shown elsewhere in the app, so a recommendation
// reads the same way.
const peso = (amount) => `₱${Math.round(amount).toLocaleString()}`;
const recordedOn = (date) =>
  new Date(date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

// Buyers filter by Fruits or Vegetables, and that follows from the catalogue
// product rather than being asked for again - so a mango can't be filed under
// vegetables.
const categoryLabel = (crop) => (crop?.listingCategory === "fruit" ? "Fruits" : "Vegetables");

// A photo is either one the listing already has, on the server, or one just
// picked, still only in this browser.
const photoSrc = (photo) =>
  photo.kind === "new" ? photo.preview : `${SERVER_URL}${photo.path}`;

// One labelled line of the summary above the price box.
function Line({ label, children }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{children}</span>
    </div>
  );
}

// What the chosen product goes for at the farmer's own municipal market, or a
// plain statement that there is no such figure. Nothing here is ever
// estimated, adjusted or borrowed from a neighbouring town: with no record for
// this product in this municipality, the farmer is told so and prices the
// listing themselves.
function RecommendedPrice({ crop, quantity, recommendation, checking, onUse }) {
  if (!crop) return null;

  const heading = (
    <p className="font-semibold text-gray-900">Recommended Price Unavailable</p>
  );

  if (checking && !recommendation) {
    return (
      <div className="mt-2 rounded-md bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
        Checking the market price for your municipality...
      </div>
    );
  }
  if (!recommendation) return null;

  // No address on the account, so there is no municipality to look a price up
  // in. Nothing is assumed about where they are.
  if (recommendation.reason === "no-municipality") {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md bg-gray-50 px-3 py-2.5 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <div>
          {heading}
          <p className="mt-0.5 text-xs text-gray-600">
            Add your municipality in Edit Profile to see the market price for your area. You can
            still set your own selling price below.
          </p>
        </div>
      </div>
    );
  }

  // The catalogue is wider than the Recommended Price feature: plenty of real
  // produce simply has no market price recorded for it.
  if (recommendation.reason === "not-supported") {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          {heading}
          <p className="mt-0.5 text-xs text-amber-900">
            Market prices aren&apos;t recorded for {recommendation.product} yet. Set your own
            selling price below.
          </p>
        </div>
      </div>
    );
  }

  if (!recommendation.available) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0">
          {heading}
          <p className="mt-0.5 text-xs text-amber-900">
            No current market-price data is available for this product in your municipality.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Your municipality: <span className="font-medium">{recommendation.municipality}</span>.
            Set your own selling price below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md bg-green-50 px-3 py-2.5 text-sm">
      <div className="flex items-start gap-2">
        <Tag className="mt-0.5 h-4 w-4 shrink-0 text-[#2f8f66]" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <Line label="Product">{recommendation.product}</Line>
          {quantity !== "" && <Line label="Quantity">{quantity} KG</Line>}
          <Line label="Municipality">{recommendation.municipality}</Line>
          {/* A variety is priced as the crop it is a variety of, and says so
              rather than passing the figure off as its own. */}
          <Line label={recommendation.pricedAs ? `Latest Market Price (${recommendation.pricedAs})` : "Latest Market Price"}>
            {peso(recommendation.pricePerKilo)}/kg
          </Line>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-green-200 pt-1">
            <span className="font-semibold text-[#2f8f66]">Recommended Selling Price</span>
            <span className="font-semibold text-[#2f8f66]">
              {peso(recommendation.pricePerKilo)}/kg
            </span>
          </div>
          <p className="pt-1 text-xs text-gray-500">
            Recommended price is based on the latest available market-price data for your
            municipality (recorded {recordedOn(recommendation.recordedAt)}). It is only a
            suggestion - you can set any price you like.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onUse(recommendation.pricePerKilo)}
          className="shrink-0 rounded-md border border-[#2f8f66] px-2.5 py-1 text-xs font-semibold text-[#2f8f66] transition hover:bg-green-100"
        >
          Use this price
        </button>
      </div>
    </div>
  );
}

// The plain text fields. The product itself isn't one of them - it is a
// catalogue row, held separately, and only its id is ever sent.
const emptyForm = {
  stock: "",
  price: "",
  salePrice: "",
  productType: "sale",
  description: "",
};

const inputClass =
  "mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

function Required() {
  return <span className="text-red-600">*</span>;
}

// A heading that divides the form into what must be filled in and what is
// worth adding, so a long single column reads as a few short ones.
function Step({ title, note, children }) {
  return (
    <section className="border-t border-gray-200 pt-5">
      <p className="font-semibold text-gray-900">{title}</p>
      {note && <p className="text-xs text-gray-500">{note}</p>}
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
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

// The listing as a buyer will meet it, built from whatever is filled in so
// far. Nothing here is saved or sent - it reads the same state the form does,
// so a photo, a price or a description shows up the moment it is entered.
function Preview({ crop, form, photos, cover, onPickPhoto, seller, town }) {
  const isPreOrder = form.productType === "preorder";
  const priced = form.price !== "" && Number(form.price) > 0;
  const asProduct = {
    price: Number(form.price),
    salePrice: form.salePrice === "" ? null : Number(form.salePrice),
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex h-64 items-center justify-center bg-gray-50 sm:h-80">
        {cover ? (
          <img
            src={photoSrc(cover)}
            alt="Listing cover"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <ImageOff className="h-14 w-14" />
            <span className="text-xs">Photos you add appear here</span>
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-2 border-b border-gray-100 p-3">
          {photos.map((photo, i) => (
            <button
              key={photo.kind === "new" ? photo.preview : photo.path}
              type="button"
              onClick={() => onPickPhoto(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={photo === cover}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 ${
                photo === cover ? "border-[#2f8f66]" : "border-transparent"
              }`}
            >
              <img src={photoSrc(photo)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-5 p-6">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-gray-900">
            {crop ? crop.name : <span className="text-gray-300">Your product</span>}
            {isPreOrder && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Pre-Order
              </span>
            )}
          </h2>

          <div className="mt-1">
            {priced ? (
              <PriceTag product={asProduct} size="lg" suffix=" per kilo" />
            ) : (
              <span className="text-lg font-semibold text-gray-300">₱0 per kilo</span>
            )}
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Listed just now in {town}
            {form.stock !== "" && ` · ${form.stock} kilos available`}
            {crop && ` · ${categoryLabel(crop)}`}
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-900">Details</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-600">
            {form.description || (
              <span className="text-gray-300">Description will appear here.</span>
            )}
          </p>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="font-semibold text-gray-900">Seller information</p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar
              src={seller?.avatar}
              alt={seller?.name || "You"}
              className="h-11 w-11 rounded-full bg-green-100 text-[#2f8f66]"
              iconClass="h-5 w-5"
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">{seller?.name || "You"}</p>
              <p className="truncate text-xs text-gray-500">{seller?.location || "Address not set"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FarmerProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(emptyForm);
  // The catalogue product this listing is of. Not part of `form`, because it
  // is a whole row rather than a typed string - the form sends its id.
  const [crop, setCrop] = useState(null);
  // Photos in display order - either ones the product already has, or files
  // just picked. The first is the cover.
  const [photos, setPhotos] = useState([]);
  // Which photo the preview is showing. Clamped at render rather than reset in
  // an effect, so removing the last one can't leave it pointing at nothing.
  const [showingPhoto, setShowingPhoto] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The suggested price for the chosen product, from the farmer's own
  // municipal market.
  const [recommendation, setRecommendation] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    getProduct(id)
      .then(({ data }) => {
        // Listings made before the product catalogue existed have no crop on
        // them; the selector simply starts empty and one has to be picked.
        setCrop(data.crop || null);
        setForm({
          // The form works in text, so the boxes show exactly what will be sent.
          stock: String(data.stock ?? ""),
          price: String(data.price ?? ""),
          salePrice: data.salePrice == null ? "" : String(data.salePrice),
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: CLEAN[name] ? CLEAN[name](value) : value }));
  };

  // Looks the price up as soon as a product is chosen. Only the product's id
  // is sent - the municipality comes from the farmer's own account, never from
  // this page and never from a device's location.
  const cropId = crop?._id || null;
  useEffect(() => {
    if (!cropId) return undefined;
    let cancelled = false;
    getPriceRecommendation(cropId)
      .then(({ data }) => {
        if (!cancelled) setRecommendation({ cropId, data });
      })
      .catch(() => {
        if (!cancelled) setRecommendation({ cropId, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [cropId]);

  // Kept with the product it was looked up for, so a price for Mango can never
  // sit under a listing that now says something else - and "still checking" is
  // simply not yet having an answer for the product now chosen.
  const answered = recommendation?.cropId === cropId;
  const priceHint = answered ? recommendation.data : null;
  const checkingPrice = Boolean(cropId) && !answered;

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

    if (!crop) {
      setError("Choose the product you are selling from the list.");
      return;
    }
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
    // The product is sent as the catalogue's own id. The server takes the
    // title and the category from that row, so neither can be made up here.
    data.append("crop", crop._id);
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

  const cover = photos.length === 0 ? null : photos[Math.min(showingPhoto, photos.length - 1)];
  const sellerName = user?.farmName || user?.name || "Your farm";
  const town = user?.address?.city || user?.location || "your municipality";

  return (
    <div className="min-h-screen bg-[#eaf6ec]">
      {/* Held at the top so Back is always a click away, however far down the
          form the farmer has got. */}
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 pr-6 text-center text-xl font-semibold">
          {isEdit ? "Edit Product" : "Add New Product"}
        </h1>
      </div>

      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        {loading ? (
          <p className="text-sm text-gray-600">Loading...</p>
        ) : (
          // The form on the left, the listing it is building on the right. The
          // preview is held in place so it stays in view while the form is
          // filled in - items-start keeps it from being stretched, which is
          // what a sticky box needs in order to stick.
          <div className="grid items-start gap-6 lg:grid-cols-[28rem_minmax(0,1fr)]">
            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <Avatar
                  src={user?.avatar}
                  alt={sellerName}
                  className="h-10 w-10 rounded-full bg-green-100 text-[#2f8f66]"
                  iconClass="h-5 w-5"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{sellerName}</p>
                  <p className="text-xs text-gray-500">Listing to AniSave · Public</p>
                </div>
              </div>

              {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

              <section className="border-t border-gray-200 pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-semibold text-gray-900">
                    Photos · {photos.length}/{MAX_PHOTOS}
                    <Required />
                  </p>
                  <p className="text-xs text-gray-500">The first one is the cover.</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  {photos.map((photo, i) => (
                    <div key={photo.kind === "new" ? photo.preview : photo.path} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowingPhoto(i)}
                        aria-label={`Preview photo ${i + 1}`}
                        className={`block h-24 w-24 overflow-hidden rounded-md border-2 bg-gray-50 ${
                          photo === cover ? "border-[#2f8f66]" : "border-gray-300"
                        }`}
                      >
                        <img
                          src={photoSrc(photo)}
                          alt={`Product photo ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>

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
              </section>

              <Step title="Required" note="Be as descriptive as possible.">
                <div>
                  <label htmlFor="crop" className="font-medium text-gray-900">
                    Product
                    <Required />
                  </label>
                  <div className="mt-1">
                    <CropSelect
                      id="crop"
                      required
                      value={crop}
                      onChange={setCrop}
                      inputClass="w-full rounded-md border border-gray-400 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Start typing and pick your product from the list - local names like ampalaya or
                    camote work too.
                  </p>
                </div>

                {/* Not asked for: the category follows from the product chosen
                    above, so a mango can't be filed under vegetables. It is
                    shown rather than hidden so there is no doubt where buyers
                    will find the listing. */}
                <div>
                  <span className="font-medium text-gray-900">Category</span>
                  <div
                    data-testid="category"
                    className="mt-1 flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <Tag className="h-4 w-4 shrink-0 text-[#2f8f66]" />
                    {crop ? (
                      <span className="font-medium text-gray-900">{categoryLabel(crop)}</span>
                    ) : (
                      <span className="text-gray-400">Set by the product you choose</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {crop
                      ? `Buyers filtering for ${categoryLabel(crop).toLowerCase()} will find it. Add the variety and anything else in the description.`
                      : "Chosen for you, so the listing always sits where buyers look for it."}
                  </p>
                </div>

                <div>
                  <label htmlFor="stock" className="font-medium text-gray-900">
                    Available Quantity/Kilos
                    <Required />
                  </label>
                  <input
                    id="stock"
                    name="stock"
                    type="text"
                    inputMode="numeric"
                    required
                    value={form.stock}
                    onChange={handleChange}
                    placeholder="Kilos available"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="price" className="font-medium text-gray-900">
                    Your Selling Price
                    <Required />
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="text"
                    inputMode="decimal"
                    required
                    value={form.price}
                    onChange={handleChange}
                    placeholder="₱ per kilo"
                    className={inputClass}
                  />
                  <RecommendedPrice
                    crop={crop}
                    quantity={form.stock}
                    recommendation={priceHint}
                    checking={checkingPrice}
                    onUse={(amount) =>
                      setForm((prev) => ({ ...prev, price: String(Math.round(amount)) }))
                    }
                  />
                </div>

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
                      Buyers can order this ahead of time. Stock is taken as you accept each
                      pre-order.
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
              </Step>

              <Step title="More details" note="Worth adding, but the listing works without them.">
                <div>
                  <label htmlFor="salePrice" className="font-medium text-gray-900">
                    Flash Sale Price{" "}
                    <span className="text-xs font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="salePrice"
                    name="salePrice"
                    type="text"
                    inputMode="decimal"
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
                    <span className="text-xs">
                      Taken from your registered address, for every listing.
                    </span>
                  </p>
                </div>
              </Step>

              {/* What a farmer is agreeing to by publishing. The rules
                  themselves live on the Terms of Use page, which opens in its
                  own tab so a half-filled form isn't lost. */}
              <p className="border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500">
                Listings on AniSave are public - anyone browsing the marketplace can see this one,
                and buyers collect it from your registered address. Sell only produce you actually
                have, and keep the price and stock honest and up to date. See our{" "}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#2f8f66] hover:underline"
                >
                  Terms of Use
                </Link>
                . The selling price must be accurate and not misleading.
              </p>

              <div className="flex gap-3">
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
            </form>

            {/* Parked just below the bar above, rather than at the very top,
                so the listing stays visible without sliding under it. */}
            <aside className="lg:sticky lg:top-[76px]">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-semibold text-gray-900">Preview</p>
                <p className="text-xs text-gray-500">How buyers will see this listing.</p>
              </div>
              <Preview
                crop={crop}
                form={form}
                photos={photos}
                cover={cover}
                onPickPhoto={setShowingPhoto}
                seller={{ name: sellerName, avatar: user?.avatar, location: user?.location }}
                town={town}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
