import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, ThumbsUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import ReportSentDialog from "../components/reports/ReportSentDialog";
import { getProduct, getProductRatings, toggleRatingLike } from "../services/api";
import useScrollReveal from "../hooks/useScrollReveal";
import usePreserveScroll from "../hooks/usePreserveScroll";
import { useSmoothNavigate } from "../utils/pageTransition";

function Stars({ value, className = "h-4 w-4" }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${className} ${
            n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-300"
          }`}
        />
      ))}
    </span>
  );
}

// Shared by both portals: a farmer sees the reviews and their helpful counts,
// and a signed-in buyer can also mark other people's reviews helpful. Buyers can
// report other people's reviews, and a farmer the ones on their own products.
export default function ProductRatings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const smoothNavigate = useSmoothNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canLike = user?.role === "buyer";
  // Coming back from the report form with { reportSent: true } shows the thank-you once.
  const [reportSent, setReportSent] = useState(Boolean(location.state?.reportSent));

  const [productTitle, setProductTitle] = useState("");
  const [ratings, setRatings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likeError, setLikeError] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const rootRef = useRef(null);
  useScrollReveal(rootRef);
  usePreserveScroll(filter);

  useEffect(() => {
    Promise.all([getProduct(id), getProductRatings(id)])
      .then(([productRes, ratingsRes]) => {
        setProductTitle(productRes.data.title);
        setRatings(ratingsRes.data);
      })
      .catch(() => setError("Could not load these ratings."))
      .finally(() => setLoading(false));
  }, [id]);

  // The thank-you is shown once: clear it from the history entry so a refresh doesn't repeat it.
  useEffect(() => {
    if (location.state?.reportSent) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A visitor who isn't signed in is asked to log in first.
  const startReport = (rating) =>
    smoothNavigate(user ? `/${user.role}/products/${id}/ratings/${rating._id}/report` : "/login");

  const handleLike = async (rating) => {
    setLikeError("");
    setPendingId(rating._id);
    try {
      const { data } = await toggleRatingLike(rating._id);
      setRatings((prev) => prev.map((r) => (r._id === rating._id ? { ...r, ...data } : r)));
    } catch (err) {
      setLikeError(err.response?.data?.message || "Could not update that. Please try again.");
    } finally {
      setPendingId(null);
    }
  };

  const average = ratings.length ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length : 0;
  const withComments = ratings.filter((r) => r.comment);
  const filters = [
    { key: "all", label: "All" },
    ...[5, 4, 3, 2, 1].map((n) => ({
      key: String(n),
      label: `${n} Star(${ratings.filter((r) => r.stars === n).length})`,
    })),
    { key: "comments", label: `With Comments(${withComments.length})` },
  ];
  const visible =
    filter === "all"
      ? ratings
      : filter === "comments"
        ? withComments
        : ratings.filter((r) => r.stars === Number(filter));

  return (
    <div ref={rootRef} className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 pr-6 text-center text-xl font-semibold">Ratings</h1>
      </div>

      <div className="mx-auto max-w-3xl p-4 sm:p-8">
        {loading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Product Ratings</h2>
              <p className="text-sm text-gray-500">{productTitle}</p>
            </div>

            <div className="mx-6 flex flex-wrap items-center gap-6 rounded-lg bg-green-100 p-5">
              <div className="text-center">
                {ratings.length > 0 ? (
                  <>
                    <p className="text-gray-900">
                      <span className="text-4xl font-semibold">{average.toFixed(1)}</span> out of 5
                    </p>
                    <div className="mt-1 flex justify-center">
                      <Stars value={average} className="h-5 w-5" />
                    </div>
                  </>
                ) : (
                  <p className="font-medium text-gray-700">No ratings yet</p>
                )}
              </div>

              <div className="flex flex-1 flex-wrap gap-2">
                {filters.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`rounded px-3 py-1.5 text-xs font-medium ${
                      filter === key
                        ? "bg-[#2f8f66] text-white"
                        : "border border-[#2f8f66]/50 bg-white text-gray-700 hover:bg-green-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {likeError && (
              <div className="mx-6 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {likeError}
              </div>
            )}

            <div className="mt-2 divide-y divide-gray-200">
              {visible.length === 0 && (
                <p className="p-8 text-center text-sm text-gray-500">
                  {ratings.length === 0 ? "Nobody has rated this product yet." : "No ratings in this filter."}
                </p>
              )}

              {visible.map((r) => (
                <div key={r._id} className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={r.buyerAvatar}
                        alt={r.buyerName}
                        className="h-10 w-10 rounded-full bg-green-100 text-[#2f8f66]"
                        iconClass="h-5 w-5"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.buyerName}</p>
                        <Stars value={r.stars} className="h-3.5 w-3.5" />
                        <p className="text-xs text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString("en-CA")}
                        </p>
                      </div>
                    </div>

                    {r.reportedByMe ? (
                      <span className="shrink-0 px-3 py-1 text-xs text-gray-400">Reported</span>
                    ) : (
                      (!user || r.canReport) && (
                        <button
                          type="button"
                          onClick={() => startReport(r)}
                          className="shrink-0 rounded border border-gray-400 px-4 py-1 text-xs text-gray-800 transition hover:bg-gray-50 active:scale-95"
                        >
                          Report review
                        </button>
                      )
                    )}
                  </div>

                  {r.comment && <p className="mt-3 pl-13 text-sm text-gray-800 sm:pl-[3.25rem]">{r.comment}</p>}

                  <div className="mt-2 flex justify-end">
                    {canLike && !r.isMine ? (
                      <button
                        type="button"
                        onClick={() => handleLike(r)}
                        disabled={pendingId === r._id}
                        aria-pressed={r.likedByMe}
                        aria-label={r.likedByMe ? "Remove your helpful mark" : "Mark this review helpful"}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm disabled:opacity-60 ${
                          r.likedByMe ? "bg-green-50 text-[#2f8f66]" : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        <ThumbsUp className={`h-4 w-4 ${r.likedByMe ? "fill-current" : ""}`} />
                        {r.likeCount}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 text-sm text-gray-500">
                        <ThumbsUp className="h-4 w-4" />
                        {r.likeCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {reportSent && <ReportSentDialog onClose={() => setReportSent(false)} />}
    </div>
  );
}
