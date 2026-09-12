import { useState } from "react";
import { Plus, Leaf } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import ProductCard from "../../components/farmer/products/ProductCard";
import ProductDetailsModal from "../../components/farmer/products/ProductDetailsModal";
import RestockModal from "../../components/farmer/products/RestockModal";
import ProductFormModal from "../../components/farmer/products/ProductFormModal";
import DeleteConfirmModal from "../../components/farmer/products/DeleteConfirmModal";

const initialProducts = [
  { id: 1, image: "🥦", title: "Brokoli / Broccoli", stock: 50, price: 100, category: "vegetable", location: "Dagupan City Random Street #1234" },
  { id: 2, image: "🍅", title: "Kamatis / Tomato", stock: 40, price: 60, category: "vegetable", location: "Dagupan City Random Street #1234" },
  { id: 3, image: "🍆", title: "Talong / Eggplant", stock: 50, price: 70, category: "vegetable", location: "Dagupan City Random Street #1234" },
  { id: 4, image: "🎃", title: "Kalabasa / Pumpkin", stock: 80, price: 40, category: "vegetable", location: "Dagupan City Random Street #1234" },
  { id: 5, image: "🥕", title: "Karot / Carrot", stock: 60, price: 50, category: "vegetable", location: "Dagupan City Random Street #1234" },
  { id: 6, image: "🥔", title: "Patatas / Potato", stock: 80, price: 45, category: "vegetable", location: "Dagupan City Random Street #1234" },
];

const filters = [
  { key: "all", label: "All" },
  { key: "vegetable", label: "Vegetables" },
  { key: "fruit", label: "Fruits" },
];

export default function FarmerProducts() {
  const [products, setProducts] = useState(initialProducts);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null); // { type: "details" | "restock" | "edit" | "delete" | "create", product? }

  const visible = filter === "all" ? products : products.filter((p) => p.category === filter);
  const closeModal = () => setModal(null);

  const handleConfirmRestock = (amount) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === modal.product.id ? { ...p, stock: p.stock + amount } : p))
    );
    closeModal();
  };

  const handleSubmitEdit = (fields) => {
    setProducts((prev) => prev.map((p) => (p.id === modal.product.id ? { ...p, ...fields } : p)));
    closeModal();
  };

  const handleConfirmDelete = () => {
    setProducts((prev) => prev.filter((p) => p.id !== modal.product.id));
    closeModal();
  };

  const handleSubmitCreate = (fields) => {
    setProducts((prev) => [...prev, { id: Date.now(), isNew: true, ...fields }]);
    closeModal();
  };

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
            <ProductCard
              key={product.id}
              product={product}
              onViewDetails={(p) => setModal({ type: "details", product: p })}
              onRestock={(p) => setModal({ type: "restock", product: p })}
              onEdit={(p) => setModal({ type: "edit", product: p })}
              onDelete={(p) => setModal({ type: "delete", product: p })}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 rounded-full bg-[#2f8f66] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56]"
          >
            Create new <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {modal?.type === "details" && <ProductDetailsModal product={modal.product} onClose={closeModal} />}

      {modal?.type === "restock" && (
        <RestockModal product={modal.product} onClose={closeModal} onConfirm={handleConfirmRestock} />
      )}

      {modal?.type === "edit" && (
        <ProductFormModal mode="edit" product={modal.product} onClose={closeModal} onSubmit={handleSubmitEdit} />
      )}

      {modal?.type === "delete" && (
        <DeleteConfirmModal product={modal.product} onClose={closeModal} onConfirm={handleConfirmDelete} />
      )}

      {modal?.type === "create" && (
        <ProductFormModal mode="create" onClose={closeModal} onSubmit={handleSubmitCreate} />
      )}
    </FarmerLayout>
  );
}
