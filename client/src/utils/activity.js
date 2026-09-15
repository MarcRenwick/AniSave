// Null when the seller has never been seen since activity tracking started,
// so callers can omit the line entirely rather than guessing a time.
export function activeAgo(date) {
  if (!date) return null;
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "Active just now";
  if (minutes < 60) return `Active ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Active ${days} day${days === 1 ? "" : "s"} ago`;
}
