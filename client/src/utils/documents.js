import { useEffect, useState } from "react";
import { SERVER_URL, getDocumentFile } from "../services/api";

// A farmer's ID and farm documents, and the photos attached to a report, are
// private: the server only gives them to the people they belong to (and admins),
// and only to a request that carries the login token. An <img src="..."> can't
// send that, so the file is fetched with the token and shown from a temporary
// copy held in the browser.
//
// (Documents uploaded before private storage existed still have a public
// /uploads path; those load directly until they've been moved.)
const PRIVATE_PREFIXES = ["/documents/", "/report-evidence/"];
const isPrivate = (path) => typeof path === "string" && PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix));

// The address to show a document from - and whether fetching it failed.
export function useDocumentUrl(path) {
  const [state, setState] = useState({ path: null, url: null, failed: false });

  useEffect(() => {
    if (!path || !isPrivate(path)) return undefined;
    let cancelled = false;
    let objectUrl = null;

    getDocumentFile(path)
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        if (!cancelled) setState({ path, url: objectUrl, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ path, url: null, failed: true });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!path) return { url: null, failed: false };
  if (!isPrivate(path)) return { url: `${SERVER_URL}${path}`, failed: false };
  // Until the file for *this* path has arrived, show nothing rather than an older one.
  return state.path === path ? state : { url: null, failed: false };
}

// Opens a document full size in a new tab, from that same temporary copy.
export async function openDocument(path) {
  if (!isPrivate(path)) {
    window.open(`${SERVER_URL}${path}`, "_blank", "noopener,noreferrer");
    return;
  }
  const { data } = await getDocumentFile(path);
  const url = URL.createObjectURL(data);
  window.open(url, "_blank", "noopener,noreferrer");
  // Long enough for the new tab to load it, then it's let go.
  setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
}
