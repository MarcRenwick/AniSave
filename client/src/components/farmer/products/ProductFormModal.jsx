import { useState } from "react";
import { Camera } from "lucide-react";
import Modal from "../../Modal";

const emptyForm = {
  title: "",
  stock: "",
  price: "",
  category: "vegetable",
  location: "",
};

export default function ProductFormModal({ mode, product, onClose, onSubmit }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(
    isEdit
      ? {
          title: product.title,
          stock: product.stock,
          price: product.price,
          category: product.category,
          location: product.location,
        }
      : emptyForm
  );
  const [photo, setPhoto] = useState(isEdit ? product.image : null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      stock: Number(form.stock),
      price: Number(form.price),
      image: photo,
    });
  };

  return (
    <Modal title={isEdit ? "Edit" : "Add new product"} onClose={onClose} maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Upload a photo*</label>
          <label className="mt-1 flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-[#2f8f66]">
            {photo ? (
              photo.length <= 4 ? (
                <span className="text-5xl">{photo}</span>
              ) : (
                <img src={photo} alt="Product preview" className="h-full w-full object-cover" />
              )
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs">
                <Camera className="h-6 w-6" />
                Add photo
              </span>
            )}
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title*
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Brokoli / Broccoli"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
              Kilos*
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              required
              value={form.stock}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
            />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price*
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
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
            />
          </div>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700">Select Category*</p>
          <div className="mt-1 flex gap-4">
            {["vegetable", "fruit"].map((cat) => (
              <label key={cat} className="flex items-center gap-1.5 text-sm capitalize text-gray-700">
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  checked={form.category === cat}
                  onChange={handleChange}
                  className="h-4 w-4 accent-[#2f8f66]"
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. Dagupan City Random Street #1234"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56]"
          >
            {isEdit ? "Save" : "Publish"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
