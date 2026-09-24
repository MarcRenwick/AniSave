import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Lock,
  Trash2,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import Avatar from "../../components/Avatar";
import PriceTag from "../../components/products/PriceTag";
import VerificationModal from "../../components/farmer/VerificationModal";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import EditProfileModal from "../../components/settings/EditProfileModal";
import ChangePasswordModal from "../../components/settings/ChangePasswordModal";
import PrivacySecurityModal from "../../components/settings/PrivacySecurityModal";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUser, getMyProducts, getFarmerProfile, SERVER_URL } from "../../services/api";
import { useSmoothNavigate, withPageTransition } from "../../utils/pageTransition";
import { listCategories } from "../../utils/categories";

export default function FarmerSettings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const smoothNavigate = useSmoothNavigate();

  const [products, setProducts] = useState([]);
  const [ratingStats, setRatingStats] = useState({ rating: 0, ratingCount: 0 });
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // The verification banners elsewhere link here with ?verification=1 so the
  // dialog opens straight away; the param is cleared once it has.
  const [searchParams, setSearchParams] = useSearchParams();
  const [showVerification, setShowVerification] = useState(
    () => searchParams.get("verification") === "1"
  );

  useEffect(() => {
    if (searchParams.get("verification") !== "1") return;
    setShowVerification(true);
    const next = new URLSearchParams(searchParams);
    next.delete("verification");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getCurrentUser(), getMyProducts(), getFarmerProfile(user._id)])
      .then(([{ data: me }, productsRes, farmerRes]) => {
        updateUser(me);
        setProducts(productsRes.data);
        setRatingStats({ rating: farmerRes.data.rating || 0, ratingCount: farmerRes.data.ratingCount || 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Logging out eases from this page to the login page.
  const handleLogout = () =>
    withPageTransition(() => {
      logout();
      navigate("/login");
    });

  const categories = [...new Set(products.map((p) => p.category))];
  const productsLabel =
    categories.length === 0
      ? "No products yet"
      : listCategories(categories);

  const sellerSince = user?.createdAt ? new Date(user.createdAt).getFullYear() : "—";
  const ratingText =
    ratingStats.ratingCount > 0
      ? `${ratingStats.rating.toFixed(1)} out of 5 (${ratingStats.ratingCount} rating${ratingStats.ratingCount === 1 ? "" : "s"})`
      : "No ratings yet";

  return (
    <FarmerLayout mainClassName="farm-page">
      <FarmerTopBar showActions={false} />

      <div className="space-y-6 p-4 sm:p-8">
        <div className="farm-banner relative rounded-2xl p-6 text-white shadow-[0_16px_32px_-20px_rgba(22,78,54,0.6)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                src={user?.avatar}
                alt={user?.name || "Profile photo"}
                className="h-20 w-20 rounded-full border-4 border-white bg-white/20 shadow-md"
                iconClass="h-10 w-10"
              />
              <div className="[text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">
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

            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-black/15 ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-black/25"
                aria-label="Profile actions"
              >
                <Menu className="h-5 w-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl bg-white shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowEdit(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4 text-[#2f8f66]" /> Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowPassword(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <KeyRound className="h-4 w-4 text-[#2f8f66]" /> Change Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowPrivacy(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Lock className="h-4 w-4 text-[#2f8f66]" /> Privacy &amp; Security
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowVerification(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#2f8f66]" /> Account Verification
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      smoothNavigate("/farmer/delete-account");
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowLogout(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4 text-[#2f8f66]" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="farm-card farm-card-sprout rounded-xl bg-white p-5 lg:col-span-2">
            <p className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <UserIcon className="h-4 w-4 text-[#2f8f66]" /> Personal Information
            </p>
            <dl className="space-y-3 text-sm [&_dt_svg]:text-[#2f8f66]/70">
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

          <div className="farm-card farm-card-wheat rounded-xl bg-white p-5 lg:col-span-3">
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {products.slice(0, 8).map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => navigate(`/farmer/products/${p._id}`)}
                    className="group overflow-hidden rounded-lg bg-gray-50 text-left shadow-sm ring-1 ring-[#2f8f66]/10 transition hover:shadow-lg hover:shadow-[#2f8f66]/15 hover:ring-[#2f8f66]/35"
                  >
                    <div className="flex h-20 items-center justify-center overflow-hidden bg-white text-gray-300">
                      {p.image ? (
                        <img
                          src={`${SERVER_URL}${p.image}`}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Package className="h-6 w-6" />
                      )}
                    </div>
                    <div className="bg-gradient-to-r from-[#2f8f66] to-[#3d9e73] px-2 py-1.5 text-white">
                      <p className="truncate text-xs font-semibold">{p.title}</p>
                      <PriceTag product={p} tone="light" size="sm" suffix="/kg" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="farm-card farm-card-leaf rounded-xl bg-white p-5">
          <p className="mb-2 font-semibold text-gray-900">Shop Description</p>
          <p className="text-sm text-gray-600">
            {user?.farmDescription || "No shop description yet. Tell buyers about your farm!"}
          </p>
        </div>
      </div>

      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onAvatarChanged={updateUser}
          onSaved={(data) => {
            updateUser(data);
            setShowEdit(false);
          }}
        />
      )}
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
      {showPrivacy && <PrivacySecurityModal onClose={() => setShowPrivacy(false)} />}
      {showVerification && <VerificationModal onClose={() => setShowVerification(false)} />}
      {showLogout && (
        <LogoutConfirmModal onClose={() => setShowLogout(false)} onConfirm={handleLogout} />
      )}
    </FarmerLayout>
  );
}
