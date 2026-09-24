export function timeAgo(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

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

// In a chat: "Active now" while they have AniSave open, otherwise how long ago
// they last were - for up to 7 days. After that it says nothing, rather than
// something like "Active 40 days ago".
export function activeStatus(online, lastActiveAt) {
  if (online) return "Active now";
  if (!lastActiveAt || Math.floor((Date.now() - new Date(lastActiveAt).getTime()) / 86400000) > 7) return null;
  return activeAgo(lastActiveAt);
}
