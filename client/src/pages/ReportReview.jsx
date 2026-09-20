import { useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createReviewReport } from "../services/api";
import { MAX_REVIEW_REPORT_DETAIL, REVIEW_REPORT_REASONS, markReviewReportSent } from "../utils/reviewReports";
import { useSmoothBack } from "../utils/pageTransition";

// Reporting a review, for buyers and for farmers (the review of one of their
// products): pick a reason - "Other Violations" has to be explained - then
// Submit. The report goes to the admins, and they land back on the ratings with
// a thank-you.
export default function ReportReview() {
  const { id, ratingId } = useParams();
  const { user } = useAuth();

  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const ratingsPath = `/${user.role}/products/${id}/ratings`;
  const goBack = useSmoothBack(ratingsPath);
  const isOther = reason === "other";
  const ready = Boolean(reason) && (!isOther || detail.trim().length > 0);

  const report = { ratingId, reason, ...(isOther ? { description: detail.trim() } : {}) };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready || sending) return;
    setError("");
    setSending(true);
    try {
      await createReviewReport(report);
      // Step back to the ratings, which show the thank-you, instead of stacking
      // another entry on top of the form.
      markReviewReportSent();
      goBack();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button type="button" onClick={goBack} aria-label="Back to the ratings">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 pr-6 text-center text-xl font-semibold">Report this review</h1>
      </div>

      <div className="mx-auto max-w-3xl p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl bg-[#bde8b9] shadow-sm">
          <p className="px-5 py-3.5 text-sm font-medium text-gray-900">Please select report reason</p>

          <div role="radiogroup" aria-label="Report reason" className="border-t border-green-900/20">
            {REVIEW_REPORT_REASONS.map(({ key, label }) => {
              const selected = reason === key;
              const rowColor = selected ? "bg-[#2f8f66] text-white" : "bg-[#7dd39b] text-gray-900 hover:bg-[#6fc78f]";

              if (key === "other" && selected) {
                return (
                  <div key={key} className={`flex items-center gap-3 border-b border-green-900/20 px-5 py-2 ${rowColor}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked="true"
                      onClick={() => setReason("")}
                      className="shrink-0 text-left text-sm font-medium"
                    >
                      {label}
                    </button>
                    <input
                      type="text"
                      autoFocus
                      value={detail}
                      maxLength={MAX_REVIEW_REPORT_DETAIL}
                      onChange={(e) => setDetail(e.target.value)}
                      placeholder="Please describe the violation in more detail. (Required)"
                      aria-label="Describe the violation"
                      aria-required="true"
                      className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1f5c42] focus:outline-none focus:ring-1 focus:ring-[#1f5c42]"
                    />
                    <Check className={`h-5 w-5 shrink-0 ${detail.trim() ? "text-white" : "text-white/40"}`} aria-hidden="true" />
                  </div>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setReason(key)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-green-900/20 px-5 py-3.5 text-left text-sm font-medium transition ${rowColor}`}
                >
                  {label}
                  {selected && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="px-5 py-4">
            {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <button
              type="submit"
              disabled={!ready || sending}
              className="mx-auto block w-full max-w-56 rounded-md bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {sending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
