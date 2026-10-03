import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Plus, Leaf, Apple, Egg, Beef, Fish } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import ProductCard from "../../components/farmer/products/ProductCard";
import VerificationBanner from "../../components/farmer/VerificationBanner";
import RestockModal from "../../components/farmer/products/RestockModal";
import DeleteConfirmModal from "../../components/farmer/products/DeleteConfirmModal";
import { getMyProducts, restockProduct, deleteProduct } from "../../services/api";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import { useAuth } from "../../context/AuthContext";
import { categoryFilters } from "../../utils/categories";
import { EmptyState, SproutLoader, Stagger, StaggerItem } from "../../components/motion";
import { SPRING } from "../../theme/harvest";

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

  // Stock going down as orders are completed (or changing in another tab)
  // shows here without a refresh.
  useLiveRefresh(["product:changed"], () =>
    getMyProducts().then(({ data }) => {
      setProducts(data);
      setError("");
    })
  );

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
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">My Products</h1>
        <p className="text-sm text-gray-500">Manage your fresh fruits and vegetables</p>
      </FarmerTopBar>

      <div className="p-4 sm:p-8">
        <div className="mb-6 empty:mb-0">
          <VerificationBanner />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 rounded-full bg-white/70 p-1.5 shadow-soft ring-1 ring-black/5">
            {[{ key: "all", label: "All" }, ...categoryFilters(products)].map(({ key, label }) => {
              const Icon = FILTER_ICONS[key];
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={active}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active ? "text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {/* The chosen filter's green slides across to the next one picked. */}
                  {active && (
                    <motion.span layoutId="product-filter-pill" className="absolute inset-0 rounded-full bg-forest-700 shadow-sm" transition={SPRING} />
                  )}
                  {Icon && <Icon className="relative h-4 w-4" />}
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate("/farmer/products/new")}
            disabled={!canSell}
            title={canSell ? undefined : "Your account needs to be verified before you can list products"}
            className="flex items-center gap-2 rounded-full bg-tomato-600 px-5 py-3 text-sm font-semibold text-white shadow-glow-tomato transition-colors hover:bg-tomato-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            <Plus className="h-4 w-4" /> Create new
          </button>
        </div>

        {loading && <SproutLoader label="Loading your products..." />}
        {error && <p className="mt-6 text-sm text-tomato-700">{error}</p>}

        {!loading && !error && visible.length === 0 && (
          <EmptyState art="crate" title="Nothing here yet" className="mt-6">
            No products yet. Click &ldquo;Create new&rdquo; to add your first one.
          </EmptyState>
        )}

        {!loading && !error && visible.length > 0 && (
          <Stagger key={filter} on="mount" className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
            {visible.map((product) => (
              <StaggerItem key={product._id} y={20}>
              <ProductCard
                key={product._id}
                product={product}
                isNew={product._id === justAddedId}
                onViewDetails={(p) => navigate(`/farmer/products/${p._id}`)}
                onRestock={(p) => setModal({ type: "restock", product: p })}
                onEdit={(p) => navigate(`/farmer/products/${p._id}/edit`)}
                onDelete={(p) => setModal({ type: "delete", product: p })}
              />
              </StaggerItem>
            ))}
          </Stagger>
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
