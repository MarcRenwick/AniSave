import { useEffect, useState } from "react";
import { Plus, Leaf } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import ProductCard from "../../components/farmer/products/ProductCard";
import ProductDetailsModal from "../../components/farmer/products/ProductDetailsModal";
import RestockModal from "../../components/farmer/products/RestockModal";
import ProductFormModal from "../../components/farmer/products/ProductFormModal";
import DeleteConfirmModal from "../../components/farmer/products/DeleteConfirmModal";
import {
  getMyProducts,
  createProduct,
  updateProduct,
  restockProduct,
  deleteProduct,
} from "../../services/api";

const filters = [
  { key: "all", label: "All" },
  { key: "vegetable", label: "Vegetables" },
  { key: "fruit", label: "Fruits" },
];

export default function FarmerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null); // { type: "details" | "restock" | "edit" | "delete" | "create", product? }
  const [justAddedId, setJustAddedId] = useState(null);

  useEffect(() => {
    getMyProducts()
      .then(({ data }) => setProducts(data))
      .catch(() => setError("Could not load your products. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  const visible = filter === "all" ? products : products.filter((p) => p.category === filter);
  const closeModal = () => setModal(null);

  const handleConfirmRestock = async (amount) => {
    const { data } = await restockProduct(modal.product._id, amount);
    setProducts((prev) => prev.map((p) => (p._id === data._id ? data : p)));
    closeModal();
  };

  const handleSubmitEdit = async (formData) => {
    const { data } = await updateProduct(modal.product._id, formData);
    setProducts((prev) => prev.map((p) => (p._id === data._id ? data : p)));
    closeModal();
  };

  const handleConfirmDelete = async () => {
    await deleteProduct(modal.product._id);
    setProducts((prev) => prev.filter((p) => p._id !== modal.product._id));
    closeModal();
  };

  const handleSubmitCreate = async (formData) => {
    const { data } = await createProduct(formData);
    setProducts((prev) => [data, ...prev]);
    setJustAddedId(data._id);
    closeModal();
  };

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">My Products</h1>
        <p className="text-sm text-gray-500">Manage your fresh fruits and vegetables</p>
      </FarmerTopBar>

      <div className="p-8">
        <div className="flex items-center justify-between">
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

          <button
            type="button"
            onClick={() => setModal({ type: "create" })}
            className="flex items-center gap-2 rounded-full bg-[#2f8f66] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56]"
          >
            Create new <Plus className="h-4 w-4" />
          </button>
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500">Loading your products...</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {!loading && !error && visible.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">
            No products yet. Click &ldquo;Create new&rdquo; to add your first one.
          </p>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-6">
            {visible.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isNew={product._id === justAddedId}
                onViewDetails={(p) => setModal({ type: "details", product: p })}
                onRestock={(p) => setModal({ type: "restock", product: p })}
                onEdit={(p) => setModal({ type: "edit", product: p })}
                onDelete={(p) => setModal({ type: "delete", product: p })}
              />
            ))}
          </div>
        )}
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
