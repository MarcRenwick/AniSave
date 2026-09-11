import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-green-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="AniSave" className="h-10 w-10 rounded-full" />
            <h1 className="text-xl font-bold text-green-700">Welcome, {user?.name}</h1>
          </div>
          <button
            onClick={logout}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Username</dt>
            <dd className="font-medium text-gray-900">{user?.username}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Role</dt>
            <dd className="font-medium capitalize text-gray-900">{user?.role}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Verification Status</dt>
            <dd className="font-medium text-gray-900">
              {user?.isVerified ? "Verified" : "Pending admin approval"}
            </dd>
          </div>
        </dl>

        <p className="mt-8 text-sm text-gray-400">
          This is a placeholder — build out the {user?.role} dashboard here (product listings,
          orders, demand board, etc.).
        </p>
      </div>
    </div>
  );
}
