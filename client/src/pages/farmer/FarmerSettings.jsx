import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Leaf,
  Star,
  Package,
  Pencil,
  KeyRound,
  Trash2,
  LogOut,
} from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import DeleteAccountModal from "../../components/farmer/settings/DeleteAccountModal";
import EditProfileModal from "../../components/farmer/settings/EditProfileModal";
import ChangePasswordModal from "../../components/farmer/settings/ChangePasswordModal";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUser, getMyProducts, getFarmerProfile, SERVER_URL } from "../../services/api";

const categoryLabels = { vegetable: "Vegetables", fruit: "Fruits" };

export default function FarmerSettings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [ratingStats, setRatingStats] = useState({ rating: 0, ratingCount: 0 });
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    setLoading(true);
    getCurrentUser()
      .then(({ data: me }) => {
        updateUser(me);
        return Promise.all([getMyProducts(), getFarmerProfile(me._id)]);
      })
      .then(([productsRes, farmerRes]) => {
        setProducts(productsRes.data);
        setRatingStats({ rating: farmerRes.data.rating || 0, ratingCount: farmerRes.data.ratingCount || 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccountDeleted = () => {
    logout();
    navigate("/login");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const categories = [...new Set(products.map((p) => p.category))];
  const productsLabel =
    categories.length === 0
      ? "No products yet"
      : categories.map((c) => categoryLabels[c] || c).join(" and ");

  const sellerSince = user?.createdAt ? new Date(user.createdAt).getFullYear() : "—";
  const ratingText =
    ratingStats.ratingCount > 0
      ? `${ratingStats.rating.toFixed(1)} out of 5 (${ratingStats.ratingCount} rating${ratingStats.ratingCount === 1 ? "" : "s"})`
      : "No ratings yet";

  return (
    <FarmerLayout>
      <FarmerTopBar />

      <div className="space-y-6 p-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2f8f66] to-[#7fd9a4] p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white/20">
                <UserIcon className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user?.name}</h2>
                <p className="text-sm text-white/90">
                  {user?.farmDescription || user?.farmName || "Farmer"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-white/90">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
                    {ratingStats.ratingCount > 0 ? `${ratingStats.rating.toFixed(1)} Rating` : "No ratings yet"}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {user?.location || "Location not set"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 rounded-xl bg-black/10 p-2">
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
              >
                <Pencil className="h-4 w-4" /> Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setShowPassword(true)}
                className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
              >
                <KeyRound className="h-4 w-4" /> Change Password
              </button>
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
              >
                <Trash2 className="h-4 w-4" /> Delete Account
              </button>
              <button
                type="button"
                onClick={() => setShowLogout(true)}
                className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/25"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-2 rounded-xl bg-white p-5 shadow-sm">
            <p className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <UserIcon className="h-4 w-4 text-[#2f8f66]" /> Personal Information
            </p>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <UserIcon className="h-4 w-4" /> Full Name
                </dt>
                <dd className="truncate font-medium text-gray-900">{user?.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Mail className="h-4 w-4" /> Email
                </dt>
                <dd className="truncate font-medium text-gray-900">{user?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Phone className="h-4 w-4" /> Contact No.
                </dt>
                <dd className="truncate font-medium text-gray-900">{user?.phone || "Not set"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <MapPin className="h-4 w-4" /> Location
                </dt>
                <dd className="truncate font-medium text-gray-900">{user?.location || "Not set"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-4 w-4" /> Seller Since
                </dt>
                <dd className="font-medium text-gray-900">{sellerSince}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Leaf className="h-4 w-4" /> Products
                </dt>
                <dd className="truncate font-medium text-gray-900">{productsLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-gray-500">
                  <Star className="h-4 w-4" /> Rating
                </dt>
                <dd className="text-right font-medium text-gray-900">{ratingText}</dd>
              </div>
            </dl>
          </div>

          <div className="col-span-3 rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold text-gray-900">
                <Package className="h-4 w-4 text-[#2f8f66]" /> My Products
              </p>
              <button
                type="button"
                onClick={() => navigate("/farmer/products")}
                className="text-xs font-medium text-[#2f8f66] hover:underline"
              >
                See More
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-gray-400">You haven&apos;t listed any products yet.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {products.slice(0, 8).map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => navigate("/farmer/products")}
                    className="overflow-hidden rounded-lg bg-gray-50 text-left shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex h-20 items-center justify-center bg-white text-gray-300">
                      {p.image ? (
                        <img
                          src={`${SERVER_URL}${p.image}`}
                          alt={p.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6" />
                      )}
                    </div>
                    <div className="bg-[#2f8f66] px-2 py-1.5 text-white">
                      <p className="truncate text-xs font-semibold">{p.title}</p>
                      <p className="text-[10px] text-white/90">₱{p.price}/kg</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Shop Description</p>
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1 text-xs font-medium text-[#2f8f66] hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
          <p className="text-sm text-gray-600">
            {user?.farmDescription || "No shop description yet. Tell buyers about your farm!"}
          </p>
        </div>
      </div>

      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={(data) => {
            updateUser(data);
            setShowEdit(false);
          }}
        />
      )}
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
      {showDelete && (
        <DeleteAccountModal onClose={() => setShowDelete(false)} onDeleted={handleAccountDeleted} />
      )}
      {showLogout && (
        <LogoutConfirmModal onClose={() => setShowLogout(false)} onConfirm={handleLogout} />
      )}
    </FarmerLayout>
  );
}
