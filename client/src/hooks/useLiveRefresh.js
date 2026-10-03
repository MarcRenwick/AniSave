import { useEffect, useRef } from "react";
import { useRealtime } from "../context/RealtimeContext";
import { forgetSharedAnswers } from "../services/api";

// Keeps what a page shows current without a refresh. `refresh` fetches it again
// from the API - the source of truth - and runs
//  - when one of `events` arrives over the live connection (and `when(payload)`,
//    if given, says it is about what this page shows), and
//  - when the connection comes back after dropping, as anything could have
//    been missed while it was down.
//
// Events close together lead to one fetch, `delay` ms after the last. A tab in
// the background waits until it is looked at again. `spread` adds up to that
// many ms more at random, for news that reaches every buyer at once, so their
// tabs don't all ask the server in the same instant. If `refresh` fails, what
// is on screen stays as it was.
//
//   useLiveRefresh(["order:changed"], loadOrders);
//   useLiveRefresh(["order:changed"], loadOrder, { when: (e) => e.orderId === id });

// Recent answers are reused for a few seconds (services/api.js) - not after a
// change, though. Counted here, shared by every page listening, so one change
// clears them once and the lists that fetch again because of it still share
// one answer between them.
let changes = 0;
let forgotten = 0;
const forgetIfChanged = () => {
  if (forgotten === changes) return;
  forgetSharedAnswers();
  forgotten = changes;
};

export default function useLiveRefresh(events, refresh, { when, delay = 300, spread = 0 } = {}) {
  const { subscribe, reconnects } = useRealtime();
  const refreshRef = useRef(refresh);
  const whenRef = useRef(when);
  useEffect(() => {
    refreshRef.current = refresh;
    whenRef.current = when;
  });

  const scheduleRef = useRef(null);
  const key = events.join(",");

  useEffect(() => {
    let timer = null;
    let waiting = false;

    const run = () => {
      waiting = false;
      forgetIfChanged();
      Promise.resolve()
        .then(() => refreshRef.current())
        .catch(() => {});
    };
    const schedule = () => {
      if (document.visibilityState === "hidden") {
        waiting = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(run, delay + Math.random() * spread);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && waiting) schedule();
    };

    const stops = key
      .split(",")
      .filter(Boolean)
      .map((event) =>
        subscribe(event, (payload) => {
          if (whenRef.current && !whenRef.current(payload)) return;
          changes += 1;
          schedule();
        })
      );
    document.addEventListener("visibilitychange", onVisible);
    scheduleRef.current = schedule;

    return () => {
      stops.forEach((stop) => stop());
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timer);
      scheduleRef.current = null;
    };
  }, [key, subscribe, delay, spread]);

  // Back from a dropped connection: whatever this page shows may have changed.
  // (Not on the page's first render - it has only just fetched.)
  const reconnectsSeen = useRef(reconnects);
  useEffect(() => {
    if (reconnects === reconnectsSeen.current) return;
    reconnectsSeen.current = reconnects;
    changes += 1;
    scheduleRef.current?.();
  }, [reconnects]);
}
