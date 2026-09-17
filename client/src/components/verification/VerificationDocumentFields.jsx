import { useEffect, useState } from "react";
import { IdCard, FileText, Plus, X } from "lucide-react";
import { SERVER_URL } from "../../services/api";

export const FARM_DOCUMENT_EXAMPLES = [
  "Farm ownership or authorization document",
  "Farmer registration document, where applicable",
  "Barangay certification or similar certification",
  "Any other farm-related document the administrator accepts",
];

const MAX_FARM_DOCUMENTS = 5;

function usePreviews(files) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file));
    setUrls(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

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
  governmentId,
  farmDocuments,
  existingGovernmentId,
  existingFarmDocuments = [],
  onGovernmentIdChange,
  onFarmDocumentsChange,
}) {
  const [govPreview] = usePreviews(governmentId ? [governmentId] : []);
  const farmPreviews = usePreviews(farmDocuments);

  const addFarmDocuments = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_FARM_DOCUMENTS - farmDocuments.length;
    if (room > 0) onFarmDocumentsChange([...farmDocuments, ...picked.slice(0, room)]);
  };

  return (
    <div className="space-y-6">
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
            <span className="text-[10px]">{existingGovernmentId || govPreview ? "Replace" : "Upload ID"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onGovernmentIdChange(file);
              }}
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
        <ul className="mt-1.5 list-inside list-disc text-xs text-gray-500">
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
              <span className="text-[10px]">Add document</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={addFarmDocuments} />
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
  );
}
