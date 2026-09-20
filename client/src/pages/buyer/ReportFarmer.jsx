import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Plus, X } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import { createReport, getFarmerProfile } from "../../services/api";
import { MAX_UPLOAD_BYTES, shrinkImage } from "../../utils/imageUpload";
import { MAX_REPORT_DESCRIPTION, MAX_REPORT_EVIDENCE, REPORT_REASONS, markReportSent, reasonLabel } from "../../utils/reports";
import { useSmoothBack } from "../../utils/pageTransition";

// A buyer reporting a farmer, in two steps: pick a reason, then say what
// happened (and, if they like, attach photos). The report goes to the admins;
// the buyer lands back on the farmer's shop with a confirmation.
export default function ReportFarmer() {
  const { id } = useParams();

  const [farmer, setFarmer] = useState(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState([]); // { file, url }
  const [preparing, setPreparing] = useState(false);
  const [pickError, setPickError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    getFarmerProfile(id)
      .then(({ data }) => setFarmer(data))
      .catch(() => setFarmer(false));
  }, [id]);

  const shopName = farmer ? farmer.farmName || farmer.name : "";
  // Stepping back, not forward onto another copy of the shop - otherwise Back
  // from the shop would lead into the form again.
  const goToShop = useSmoothBack(`/buyer/farmers/${id}`);

  const addEvidence = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_REPORT_EVIDENCE - evidence.length;
    if (room <= 0 || picked.length === 0) return;

    setPickError("");
    setPreparing(true);
    try {
      const images = picked.filter((file) => file.type.startsWith("image/"));
      const shrunk = await Promise.all(images.slice(0, room).map(shrinkImage));
      const ready = shrunk.filter((file) => file.size <= MAX_UPLOAD_BYTES);

      if (images.length < picked.length) setPickError("Only photos can be attached.");
      else if (picked.length > room) setPickError(`You can attach up to ${MAX_REPORT_EVIDENCE} photos.`);
      else if (ready.length < shrunk.length) setPickError("A photo is still over 5 MB after resizing. Please pick a smaller one.");

      setEvidence((prev) => [...prev, ...ready.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    } finally {
      setPreparing(false);
    }
  };

  const removeEvidence = (index) => {
    URL.revokeObjectURL(evidence[index].url);
    setEvidence((prev) => prev.filter((_, i) => i !== index));
    setPickError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("farmerId", id);
      data.append("reason", reason);
      data.append("description", description.trim());
      evidence.forEach(({ file }) => data.append("evidence", file));
      await createReport(data);
      evidence.forEach(({ url }) => URL.revokeObjectURL(url));
      // Back on the shop, which shows the "Successfully Reported" confirmation.
      markReportSent();
      goToShop();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const canSubmit = description.trim().length > 0 && !submitting && !preparing;

  return (
    <BuyerLayout>
      <div className="mx-auto max-w-2xl p-8">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="relative flex items-center justify-center bg-[#2f8f66] px-4 py-3.5 text-white">
            <button
              type="button"
              onClick={reason ? () => setReason("") : goToShop}
              aria-label={reason ? "Back to the reasons" : "Back to the shop"}
              className="absolute left-3 flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-semibold">Report this user</h1>
          </div>

          {farmer === false ? (
            <p className="p-6 text-sm text-gray-500">This shop isn&apos;t available to report.</p>
          ) : !reason ? (
            <div className="bg-green-50">
              <p className="px-5 pb-3 pt-4 text-sm font-semibold text-gray-800">
                Select Reason
                {shopName && <span className="font-normal text-gray-500"> · {shopName}</span>}
              </p>
              <ul className="divide-y divide-green-100 border-t border-green-100">
                {REPORT_REASONS.map(({ key, label }) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setReason(key)}
                      className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-medium text-gray-800 transition hover:bg-green-100"
                    >
                      {label}
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 bg-green-50 px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">Reason{shopName && ` · ${shopName}`}</p>
                  <p className="text-sm font-semibold text-gray-900">{reasonLabel(reason)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReason("")}
                  className="text-xs font-medium text-[#2f8f66] hover:underline"
                >
                  Change
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="report-description" className="text-sm font-medium text-gray-700">
                    Report Description<span className="text-red-600">*</span>
                  </label>
                  <span className="text-xs text-gray-500">
                    {description.length}/{MAX_REPORT_DESCRIPTION}
                  </span>
                </div>
                <textarea
                  id="report-description"
                  rows={5}
                  maxLength={MAX_REPORT_DESCRIPTION}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide more details about your report"
                  className="mt-1 w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">
                  Upload Evidence <span className="font-normal text-gray-500">(optional)</span>
                </p>

                {evidence.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    {evidence.map(({ url }, i) => (
                      <div key={url} className="relative">
                        <img
                          src={url}
                          alt={`Evidence ${i + 1}`}
                          className="h-16 w-16 rounded-lg border border-gray-300 bg-white object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeEvidence(i)}
                          aria-label={`Remove evidence ${i + 1}`}
                          className="absolute -right-2 -top-2 rounded-full bg-red-600 p-0.5 text-white shadow"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {evidence.length < MAX_REPORT_EVIDENCE && (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={preparing}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 bg-white py-3 text-sm text-gray-500 transition hover:border-[#2f8f66] hover:text-[#2f8f66] disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    {preparing ? "Preparing..." : "Add file"}
                  </button>
                )}
                <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" onChange={addEvidence} tabIndex={-1} />

                <p className="mt-1.5 text-xs text-gray-500">
                  Up to {MAX_REPORT_EVIDENCE} photos, 5 MB each (JPG, PNG, WebP or GIF).
                </p>
                {pickError && <p className="mt-1 text-xs text-red-600">{pickError}</p>}
              </div>

              {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-md bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}
