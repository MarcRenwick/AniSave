import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  Camera,
  ChevronRight,
  KeyRound,
  Leaf,
  Lock,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Scale,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import Avatar from "../../components/Avatar";
import BlockedUsersModal from "../../components/buyer/settings/BlockedUsersModal";
import DeleteAccountModal from "../../components/buyer/settings/DeleteAccountModal";
import EditProfileModal from "../../components/settings/EditProfileModal";
import ChangePasswordModal from "../../components/settings/ChangePasswordModal";
import PrivacySecurityModal from "../../components/settings/PrivacySecurityModal";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { getCurrentUser, getBuyerOrders } from "../../services/api";
import { withPageTransition } from "../../utils/pageTransition";

// One of the three figures under the photo. They are counted from this
// account's own orders and cart - nothing here is decorative.
function Stat({ icon: Icon, value, label }) {
  return (
    <div>
      <Icon className="mx-auto h-4 w-4 text-[#2f8f66]" />
      <p className="mt-1 text-lg font-bold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

// A heading and its rows. `danger` is for the one group whose rows can't be
// undone, so it doesn't look like the others.
function Group({ icon: Icon, title, blurb, danger = false, children }) {
  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        danger ? "border-red-200 bg-red-50/50" : "border-gray-200 bg-white"
      }`}
      data-reveal
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            danger ? "bg-red-100 text-red-600" : "bg-green-100 text-[#2f8f66]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className={`text-base font-semibold ${danger ? "text-red-700" : "text-gray-900"}`}>
            {title}
          </h2>
          <p className="text-xs text-gray-500">{blurb}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, title, blurb, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition duration-150 ${
        danger
          ? "border-red-200 hover:border-red-300 hover:bg-red-50"
          : "border-gray-200 hover:border-[#2f8f66] hover:bg-green-50"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${danger ? "text-red-600" : "text-[#2f8f66]"}`} />
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${danger ? "text-red-700" : "text-gray-900"}`}>
          {title}
        </span>
        <span className="block text-xs text-gray-500">{blurb}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}

// What's on file, kept on the page rather than only inside the Edit Profile
// dialog - an email or a phone number is worth being able to check at a glance.
function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="truncate text-sm text-gray-900">{value || "Not set"}</dd>
    </div>
  );
}

export default function BuyerSettings() {
  const { user, updateUser, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  const [orders, setOrders] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(({ data }) => updateUser(data))
      .catch(() => {});
    // The figures under the photo. A failure leaves them as a dash rather than
    // an error - they are a nicety, and the rest of the page still works.
    getBuyerOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setOrders([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kilos = orders?.reduce((sum, order) => sum + (Number(order.quantity) || 0), 0) ?? 0;

  // Logging out (or deleting the account) eases from this page to the login page.
  const leaveToLogin = () =>
    withPageTransition(() => {
      logout();
      navigate("/login");
    });
  const handleAccountDeleted = leaveToLogin;
  const handleLogout = leaveToLogin;

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-[#2f8f66]">
            <Leaf className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900">Profile &amp; Settings</h1>
            <p className="text-sm text-gray-500">Manage your details, your security and your data.</p>
          </div>
        </div>
      </BuyerTopBar>

      <div className="p-8">
        <div className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
          {/* ------------------------------------------------ who you are */}
          <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" data-reveal>
            <div className="h-24 bg-gradient-to-br from-[#1f5c42] via-[#2f8f66] to-[#35a074]" />

            <div className="-mt-12 flex flex-col items-center px-6 pb-6">
              <div className="relative">
                <Avatar
                  src={user?.avatar}
                  alt={user?.name || "Profile photo"}
                  className="h-24 w-24 rounded-full border-4 border-white bg-green-100 text-[#2f8f66]"
                  iconClass="h-12 w-12"
                />
                {/* Leads to the same dialog the photo is changed in. */}
                <button
                  type="button"
                  onClick={() => setShowEdit(true)}
                  aria-label="Change your profile photo"
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#2f8f66] text-white ring-2 ring-white hover:bg-[#267a56]"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <h2 className="mt-3 text-center text-xl font-bold text-gray-900">{user?.name}</h2>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-[#2f8f66]">
                <ShoppingBasket className="h-3.5 w-3.5" />
                Buyer
              </span>
              <p className="mt-2 flex items-center gap-1 text-center text-sm text-gray-500">
                <MapPin className="h-4 w-4 shrink-0 text-[#2f8f66]" />
                {user?.location || "Location not set"}
              </p>

              <dl className="mt-5 grid w-full grid-cols-3 gap-2 rounded-xl bg-gray-50 px-2 py-4 text-center">
                <Stat icon={Package} value={orders ? orders.length : "-"} label="Orders" />
                <Stat icon={Scale} value={orders ? `${kilos} kg` : "-"} label="Ordered" />
                <Stat icon={ShoppingCart} value={items.length} label="In cart" />
              </dl>

              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition duration-150 hover:bg-[#267a56] active:scale-[0.98]"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>

              <p className="mt-5 flex items-center gap-1.5 text-center text-xs italic text-[#2f8f66]">
                <Leaf className="h-3.5 w-3.5 shrink-0" />
                Fresh food, straight from the farm.
              </p>
            </div>
          </aside>

          {/* --------------------------------------------- what you can do */}
          <div className="space-y-4">
            <Group
              icon={UserRound}
              title="Personal Information"
              blurb="Update your personal details and contact information."
            >
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-gray-50 px-4 py-3">
                <Detail label="Full name" value={user?.name} />
                <Detail label="Contact number" value={user?.phone} />
                <Detail label="Email" value={user?.email} />
                <Detail label="Address" value={user?.location} />
              </dl>
              <Row
                icon={Pencil}
                title="Edit Profile"
                blurb="Change your name, email, phone number and address."
                onClick={() => setShowEdit(true)}
              />
            </Group>

            <Group icon={ShieldCheck} title="Account & Security" blurb="Keep your account safe and secure.">
              <Row
                icon={KeyRound}
                title="Change Password"
                blurb="Update your password regularly."
                onClick={() => setShowPassword(true)}
              />
              <Row
                icon={Ban}
                title="Blocked Users"
                blurb="Manage the shops you've blocked."
                onClick={() => setShowBlocked(true)}
              />
            </Group>

            <Group icon={Lock} title="Privacy & Safety" blurb="Control your data and how you sign in.">
              <Row
                icon={ShieldCheck}
                title="Privacy & Security"
                blurb="Two-step sign-in, and a copy of what AniSave holds about you."
                onClick={() => setShowPrivacy(true)}
              />
              <Row
                icon={LogOut}
                title="Log Out"
                blurb="Sign out of AniSave on this device."
                onClick={() => setShowLogout(true)}
              />
            </Group>

            <Group
              icon={AlertTriangle}
              title="Danger Zone"
              blurb="Irreversible actions for your account."
              danger
            >
              <Row
                icon={Trash2}
                title="Delete Account"
                blurb="Permanently delete your AniSave account and data."
                onClick={() => setShowDelete(true)}
                danger
              />
            </Group>
          </div>
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
      {showBlocked && <BlockedUsersModal onClose={() => setShowBlocked(false)} />}
      {showPrivacy && <PrivacySecurityModal onClose={() => setShowPrivacy(false)} />}
      {showDelete && (
        <DeleteAccountModal onClose={() => setShowDelete(false)} onDeleted={handleAccountDeleted} />
      )}
      {showLogout && (
        <LogoutConfirmModal onClose={() => setShowLogout(false)} onConfirm={handleLogout} />
      )}
    </BuyerLayout>
  );
}
