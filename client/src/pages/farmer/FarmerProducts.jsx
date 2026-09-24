import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Leaf, Apple, Egg, Beef, Fish } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import ProductCard from "../../components/farmer/products/ProductCard";
import VerificationBanner from "../../components/farmer/VerificationBanner";
import RestockModal from "../../components/farmer/products/RestockModal";
import DeleteConfirmModal from "../../components/farmer/products/DeleteConfirmModal";
import { getMyProducts, restockProduct, deleteProduct } from "../../services/api";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import { useAuth } from "../../context/AuthContext";
import { categoryFilters } from "../../utils/categories";

// Each kind of produce gets its own little picture on its filter.
const FILTER_ICONS = { vegetable: Leaf, fruit: Apple, egg: Egg, meat: Beef, seafood: Fish };

export default function FarmerProducts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const justAddedId = useLocation().state?.justAddedId;
  // Matches the server: only an approved farmer can list products.
  const canSell = Boolean(user?.isVerified);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null); // { type: "restock" | "delete", product }
  usePreserveScroll(filter);

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
    setProducts((prev) => prev.map((p) => (p._id === data._id ? { ...p, ...data } : p)));
    closeModal();
  };

  const handleConfirmDelete = async () => {
    await deleteProduct(modal.product._id);
    setProducts((prev) => prev.filter((p) => p._id !== modal.product._id));
    closeModal();
  };

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Products</h1>
        <p className="text-sm text-gray-500">Manage your fresh fruits and vegetables</p>
      </FarmerTopBar>

      <div className="p-8">
        <div className="mb-6 empty:mb-0">
          <VerificationBanner />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            {[{ key: "all", label: "All" }, ...categoryFilters(products)].map(({ key, label }) => {
              const Icon = FILTER_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition ${
                    filter === key
                      ? "bg-[#2f8f66] text-white"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate("/farmer/products/new")}
            disabled={!canSell}
            title={canSell ? undefined : "Your account needs to be verified before you can list products"}
            className="flex items-center gap-2 rounded-full bg-[#2f8f66] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#267a56] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Create new
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
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isNew={product._id === justAddedId}
                onViewDetails={(p) => navigate(`/farmer/products/${p._id}`)}
                onRestock={(p) => setModal({ type: "restock", product: p })}
                onEdit={(p) => navigate(`/farmer/products/${p._id}/edit`)}
                onDelete={(p) => setModal({ type: "delete", product: p })}
              />
            ))}
          </div>
        )}
      </div>

      {modal?.type === "restock" && (
        <RestockModal product={modal.product} onClose={closeModal} onConfirm={handleConfirmRestock} />
      )}

      {modal?.type === "delete" && (
        <DeleteConfirmModal product={modal.product} onClose={closeModal} onConfirm={handleConfirmDelete} />
      )}
    </FarmerLayout>
  );
}
