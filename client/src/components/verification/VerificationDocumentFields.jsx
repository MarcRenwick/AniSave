import { useEffect, useState } from "react";
import { IdCard, FileText, Plus, X } from "lucide-react";
import { SERVER_URL } from "../../services/api";
import { MAX_UPLOAD_BYTES, shrinkImage } from "../../utils/imageUpload";

export const FARM_DOCUMENT_EXAMPLES = [
  "Farm ownership or authorization document",
  "Farmer registration document, where applicable",
  "Barangay certification or similar certification",
  "Any other farm-related document the administrator accepts",
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

function Thumb({ src, alt, onRemove }) {
  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        className="h-24 w-24 rounded-lg border border-gray-300 object-cover"
      />
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

// Shared by registration and the resubmit form on the farmer's profile.
export default function VerificationDocumentFields({
  className = "space-y-6",
  governmentId,
  farmDocuments,
  existingGovernmentId,
  existingFarmDocuments = [],
  onGovernmentIdChange,
  onFarmDocumentsChange,
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

  return (
    <div>
      <div className={className}>
        <section>
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <IdCard className="h-4 w-4 text-[#2f8f66]" />
            Identity verification
            <span className="text-red-600">*</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            A photo of a valid government-issued ID. The administrator checks that the name and
            details match what you entered.
          </p>

          <div className="mt-3 flex items-center gap-3">
            {govPreview ? (
              <Thumb src={govPreview} alt="Government ID" onRemove={() => onGovernmentIdChange(null)} />
            ) : existingGovernmentId ? (
              <Thumb src={`${SERVER_URL}${existingGovernmentId}`} alt="Government ID on file" />
            ) : null}

            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-400 bg-gray-50 text-gray-500 hover:border-[#2f8f66]">
              <Plus className="h-5 w-5" />
              <span className="text-[10px]">
                {preparing ? "Preparing..." : existingGovernmentId || govPreview ? "Replace" : "Upload ID"}
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={preparing}
                className="hidden"
                onChange={pickGovernmentId}
              />
            </label>
          </div>
        </section>

        <section>
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FileText className="h-4 w-4 text-[#2f8f66]" />
            Farmer verification
            <span className="text-red-600">*</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            At least one document showing you farm or have legitimate farming activity:
          </p>
          <ul className="mt-1.5 list-outside list-disc pl-4 text-xs text-gray-500">
            {FARM_DOCUMENT_EXAMPLES.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {existingFarmDocuments.map((path) => (
              <Thumb key={path} src={`${SERVER_URL}${path}`} alt="Farm document on file" />
            ))}

            {farmPreviews.map((src, i) => (
              <Thumb
                key={src}
                src={src}
                alt={`Farm document ${i + 1}`}
                onRemove={() => onFarmDocumentsChange(farmDocuments.filter((_, index) => index !== i))}
              />
            ))}

            {farmDocuments.length < MAX_FARM_DOCUMENTS && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-400 bg-gray-50 text-gray-500 hover:border-[#2f8f66]">
                <Plus className="h-5 w-5" />
                <span className="text-[10px]">{preparing ? "Preparing..." : "Add document"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={preparing}
                  className="hidden"
                  onChange={addFarmDocuments}
                />
              </label>
            )}
          </div>

          {existingFarmDocuments.length > 0 && farmDocuments.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">
              The documents you add here replace the ones already on file.
            </p>
          )}
        </section>
      </div>

      {pickError && <p className="mt-3 text-xs text-red-600">{pickError}</p>}
    </div>
  );
}
