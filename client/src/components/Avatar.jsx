import { User as UserIcon } from "lucide-react";
import { SERVER_URL } from "../services/api";

// Shows a user's uploaded photo, falling back to the generic person icon for
// anyone who hasn't set one. Sizing/shape comes from the caller's className.
export default function Avatar({ src, alt = "", className = "", iconClass = "h-6 w-6" }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
      {src ? (
        <img src={`${SERVER_URL}${src}`} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <UserIcon className={iconClass} />
      )}
    </span>
  );
}
