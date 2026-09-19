import { useEffect, useState } from "react";
import { Check, IdCard, FileText, Plus, Upload, X } from "lucide-react";
import ProtectedImage from "../ProtectedImage";
import { MAX_UPLOAD_BYTES, shrinkImage } from "../../utils/imageUpload";

const ACCEPTED_FARM_DOCUMENTS = [
  "Farm ownership or authorization",
  "Farmer registration",
  "Barangay certification",
  "Other farm-related document",
];

const MAX_FARM_DOCUMENTS = 5;

function usePreviews(files) {
  // Callers pass a fresh array on every render (`[]`, `[file]`), so the list only
  // counts as changed when the files in it differ. Keying the effect on the array
  // itself re-ran it every render, and its setState rendered again - an endless
  // loop that starved React Router's navigation, so clicking a link changed the
  // URL but never the page.
  const [current, setCurrent] = useState(files);
  if (current.length !== files.length || current.some((file, i) => file !== files[i])) {
    setCurrent(files);
  }

  const [urls, setUrls] = useState([]);

  useEffect(() => {
    const next = current.map((file) => URL.createObjectURL(file));
    setUrls(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [current]);

  return urls;
}

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// A picked file shows from its own temporary address (`src`); one already on
// file is private, so it is fetched with the login (`path`, see ProtectedImage).
function Thumb({ src, path, alt, onRemove }) {
  const look = "h-14 w-14 rounded-lg border border-gray-200 object-cover";
  return (
    <div className="relative shrink-0">
      {path ? <ProtectedImage path={path} alt={alt} className={look} /> : <img src={src} alt={alt} className={look} />}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${alt}`}
          className="absolute -right-2 -top-2 rounded-full bg-red-600 p-0.5 text-white shadow"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// One card per document. Both cards share this layout - icon, title, a short
// line on what to upload, a status on the right, and the upload area below - so
// they read as a matching pair.
function DocumentCard({ icon: Icon, title, required, hint, status, done, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-[#2f8f66]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {title}
              {required && <span className="ml-1 text-red-600">*</span>}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {status}
            </span>
          </div>
          {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
        </div>
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function DropZone({ label, preparing, multiple, onPick }) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-2 text-gray-500 transition focus-within:ring-2 focus-within:ring-[#2f8f66] hover:border-[#2f8f66] hover:bg-green-50 hover:text-[#2f8f66]">
      <Upload className="h-5 w-5 shrink-0" />
      <span className="text-left leading-tight">
        <span className="block text-sm font-semibold text-gray-700">{preparing ? "Preparing..." : label}</span>
        <span className="block text-xs text-gray-500">Photo (JPG or PNG), up to 5 MB</span>
      </span>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={preparing}
        className="sr-only"
        onChange={onPick}
      />
    </label>
  );
}

// Shared by registration and the resubmit form on the farmer's profile.
// `readOnly` shows what's on file without any way to change it.
export default function VerificationDocumentFields({
  className = "space-y-3",
  governmentId,
  farmDocuments,
  existingGovernmentId,
  existingFarmDocuments = [],
  onGovernmentIdChange,
  onFarmDocumentsChange,
  readOnly = false,
}) {
  const [govPreview] = usePreviews(governmentId ? [governmentId] : []);
  const farmPreviews = usePreviews(farmDocuments);
  const [pickError, setPickError] = useState("");
  const [preparing, setPreparing] = useState(false);

  // Big photos are shrunk as soon as they're picked, and anything still too
  // large is turned away here - not after the whole form has been submitted.
  const prepareFiles = async (files) => {
    setPickError("");
    setPreparing(true);
    try {
      const images = files.filter((file) => file.type.startsWith("image/"));
      const shrunk = await Promise.all(images.map(shrinkImage));
      const ready = shrunk.filter((file) => file.size <= MAX_UPLOAD_BYTES);

      if (images.length < files.length) {
        setPickError("Only photos can be uploaded.");
      } else if (ready.length < shrunk.length) {
        setPickError("That photo is still over 5 MB after resizing. Please pick a smaller one.");
      }
      return ready;
    } finally {
      setPreparing(false);
    }
  };

  const pickGovernmentId = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const [ready] = await prepareFiles([file]);
    if (ready) onGovernmentIdChange(ready);
  };

  const addFarmDocuments = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_FARM_DOCUMENTS - farmDocuments.length;
    if (room <= 0 || picked.length === 0) return;
    const ready = await prepareFiles(picked.slice(0, room));
    if (ready.length) onFarmDocumentsChange([...farmDocuments, ...ready]);
  };

  const hasId = Boolean(governmentId || existingGovernmentId);
  const farmCount = farmDocuments.length || existingFarmDocuments.length;
  const farmStatus = readOnly
    ? `${farmCount} on file`
    : farmDocuments.length
      ? `${farmDocuments.length} of ${MAX_FARM_DOCUMENTS} added`
      : farmCount
        ? `${farmCount} on file`
        : "Not uploaded";

  return (
    <div>
      <div className={className}>
        <DocumentCard
          icon={IdCard}
          title="Government-issued ID"
          required
          hint={readOnly ? null : "A clear photo of a valid ID. Its name and details must match what you entered."}
          status={hasId ? (readOnly || !governmentId ? "On file" : "Uploaded") : "Not uploaded"}
          done={hasId}
        >
          {hasId ? (
            <div className="flex items-center gap-3">
              {governmentId ? (
                govPreview ? (
                  <Thumb src={govPreview} alt="Government ID" onRemove={() => onGovernmentIdChange(null)} />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                )
              ) : (
                <Thumb path={existingGovernmentId} alt="Government ID on file" />
              )}
              <div className="min-w-0 flex-1 text-xs">
                <p className="truncate font-medium text-gray-800">
                  {governmentId ? governmentId.name : "ID photo on file"}
                </p>
                <p className="text-gray-500">{governmentId ? formatSize(governmentId.size) : "Submitted earlier"}</p>
              </div>
              {!readOnly && (
                <label className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 focus-within:ring-2 focus-within:ring-[#2f8f66] hover:bg-gray-50">
                  {preparing ? "Preparing..." : "Replace"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={preparing}
                    className="sr-only"
                    onChange={pickGovernmentId}
                  />
                </label>
              )}
            </div>
          ) : (
            !readOnly && <DropZone label="Upload ID photo" preparing={preparing} onPick={pickGovernmentId} />
          )}
        </DocumentCard>

        <DocumentCard
          icon={FileText}
          title="Farm documents"
          required
          hint={readOnly ? null : "At least one document showing you farm or have legitimate farming activity."}
          status={farmStatus}
          done={farmCount > 0}
        >
          {!readOnly && (
            <ul className="mb-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-2">
              {ACCEPTED_FARM_DOCUMENTS.map((example) => (
                <li key={example} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#2f8f66]" />
                  {example}
                </li>
              ))}
            </ul>
          )}

          {farmCount === 0 ? (
            !readOnly && (
              <DropZone label="Upload farm documents" preparing={preparing} multiple onPick={addFarmDocuments} />
            )
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {existingFarmDocuments.map((path) => (
                <Thumb key={path} path={path} alt="Farm document on file" />
              ))}

              {farmPreviews.map((src, i) => (
                <Thumb
                  key={src}
                  src={src}
                  alt={`Farm document ${i + 1}`}
                  onRemove={() => onFarmDocumentsChange(farmDocuments.filter((_, index) => index !== i))}
                />
              ))}

              {!readOnly && farmDocuments.length < MAX_FARM_DOCUMENTS && (
                <label className="flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 focus-within:ring-2 focus-within:ring-[#2f8f66] hover:border-[#2f8f66] hover:text-[#2f8f66]">
                  <Plus className="h-4 w-4" />
                  <span className="text-[10px]">{preparing ? "..." : "Add"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={preparing}
                    className="sr-only"
                    onChange={addFarmDocuments}
                  />
                </label>
              )}
            </div>
          )}

          {!readOnly && existingFarmDocuments.length > 0 && farmDocuments.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">
              The documents you add here replace the ones already on file.
            </p>
          )}
        </DocumentCard>
      </div>

      {pickError && <p className="mt-3 text-xs text-red-600">{pickError}</p>}
    </div>
  );
}
