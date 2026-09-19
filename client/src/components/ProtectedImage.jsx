import { useDocumentUrl } from "../utils/documents";

// An image that may live in private storage (a farmer's ID or farm document).
// See utils/documents.js for how it is fetched.
export default function ProtectedImage({ path, alt, className = "" }) {
  const { url, failed } = useDocumentUrl(path);

  if (url) return <img src={url} alt={alt} className={className} />;
  return (
    <div
      role="img"
      aria-label={failed ? `${alt} unavailable` : `Loading ${alt}`}
      className={`flex items-center justify-center bg-gray-100 text-[10px] text-gray-400 ${className}`}
    >
      {failed ? "Unavailable" : ""}
    </div>
  );
}
