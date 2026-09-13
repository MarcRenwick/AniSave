import { useEffect, useState } from "react";
import { Wallet, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import TopUpRequestModal from "../../components/buyer/TopUpRequestModal";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUser, getMyTopUpRequests } from "../../services/api";

const statusMeta = {
  pending: { label: "Pending", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-green-700 bg-green-50" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-600 bg-red-50" },
};

export default function BuyerWallet() {
  const { user, updateUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadRequests = () => {
    setLoading(true);
    getMyTopUpRequests()
      .then(({ data }) => setRequests(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getCurrentUser().then(({ data }) => updateUser({ walletBalance: data.walletBalance }));
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitted = (request) => {
    setRequests((prev) => [request, ...prev]);
    setShowModal(false);
  };

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Wallet</h1>
      </BuyerTopBar>

      <div className="p-8">
        <div className="flex items-center justify-between rounded-2xl bg-[#2f8f66] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-white/80">Current Balance</p>
              <p className="text-3xl font-bold">₱{user?.walletBalance ?? 0}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#2f8f66] hover:bg-green-50"
          >
            <Plus className="h-4 w-4" />
            Request Top-up
          </button>
        </div>

        <h2 className="mt-8 text-lg font-semibold text-gray-900">Top-up History</h2>

        {loading && <p className="mt-3 text-sm text-gray-500">Loading...</p>}

        {!loading && requests.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">No top-up requests yet.</p>
        )}

        {!loading && requests.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm">
            {requests.map((req) => {
              const meta = statusMeta[req.status];
              const Icon = meta.icon;
              return (
                <div
                  key={req._id}
                  className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">₱{req.amount}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(req.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <TopUpRequestModal onClose={() => setShowModal(false)} onSubmitted={handleSubmitted} />
      )}
    </BuyerLayout>
  );
}
