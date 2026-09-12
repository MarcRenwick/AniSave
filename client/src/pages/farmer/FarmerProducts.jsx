import { useState } from "react";
import { MoreHorizontal, Plus, Leaf } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";

const products = [
  { emoji: "🥦", nameFil: "Brokoli", nameEn: "Broccoli", stock: 50, category: "vegetable" },
  { emoji: "🍅", nameFil: "Kamatis", nameEn: "Tomato", stock: 40, category: "vegetable" },
  { emoji: "🍆", nameFil: "Talong", nameEn: "Eggplant", stock: 50, category: "vegetable" },
  { emoji: "🎃", nameFil: "Kalabasa", nameEn: "Pumpkin", stock: 80, category: "vegetable" },
  { emoji: "🥕", nameFil: "Karot", nameEn: "Carrot", stock: 60, category: "vegetable" },
  { emoji: "🥔", nameFil: "Patatas", nameEn: "Potato", stock: 80, category: "vegetable" },
];

const filters = [
  { key: "all", label: "All" },
  { key: "vegetable", label: "Vegetables" },
  { key: "fruit", label: "Fruits" },
];

export default function FarmerProducts() {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? products : products.filter((p) => p.category === filter);

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">My Products</h1>
        <p className="text-sm text-gray-500">Manage your fresh fruits and vegetables</p>
      </FarmerTopBar>

      <div className="p-8">
        <div className="flex gap-3">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === key
                  ? "bg-[#2f8f66] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {key !== "all" && <Leaf className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-6">
          {visible.map((product) => (
            <div key={product.nameEn} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="relative flex h-32 items-center justify-center bg-white text-6xl">
                {product.emoji}
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-gray-100"
                  aria-label="Product options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2 bg-[#2f8f66] px-4 py-3 text-white">
                <p className="text-sm font-semibold">
                  {product.nameFil} / {product.nameEn}
                </p>
                <p className="text-xs text-white/90">Current Stock: {product.stock} kg</p>
                <button
                  type="button"
                  className="w-full rounded-md bg-white py-1.5 text-sm font-semibold text-[#2f8f66] transition hover:bg-green-50"
                >
                  Restock
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-[#2f8f66] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56]"
          >
            Create new <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </FarmerLayout>
  );
}
