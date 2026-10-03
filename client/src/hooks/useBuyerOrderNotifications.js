import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import { getBuyerOrders } from "../services/api";
import useLiveRefresh from "./useLiveRefresh";

// A buyer hears about their orders two ways:
//  - a toast the moment the farmer moves one on (accepted, ready, completed,
//    declined), over the live connection - or, for what happened while they
//    were away, once when they come back;
//  - a count on My Orders of the orders that have changed since they last
//    looked at them, which goes once they open My Orders (or that order).
//
// Both are remembered in this browser: `told` is the status each order was
// last announced (or known) at, so the same change isn't announced on every
// page; `seen` is the status each order was last looked at in.
const STORAGE_KEY = "anisave_buyer_order_updates";
// Where `told` used to be kept, before there was a count.
const OLD_STORAGE_KEY = "anisave_buyer_seen_order_statuses";

function readStore() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.told && stored?.seen) return stored;
    const old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
    return old ? { told: old, seen: { ...old } } : null;
  } catch {
    return null;
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    localStorage.removeItem(OLD_STORAGE_KEY);
  } catch {
    // Private browsing, or storage full: the count just doesn't survive a reload.
  }
}

// What the farmer did, in the buyer's words.
const messages = {
  processing: (order) => `${order.productTitle}: the seller accepted your order and is preparing it.`,
  ready: (order) => `Your order for ${order.productTitle} is ready for pickup!`,
  done: (order) => `Your order for ${order.productTitle} is complete. Enjoy!`,
  cancelled: (order) => `The seller declined your order for ${order.productTitle}.`,
};
// Moves made while the buyer was away that are toasted when they come back.
// (Not "cancelled": from the order alone, a decline can't be told apart from
// the buyer cancelling it themselves.)
const TOLD_ON_RETURN = ["processing", "ready", "done"];
// What counts towards the number on My Orders.
const COUNTED = ["processing", "ready", "done", "cancelled"];

const statusesOf = (orders) => Object.fromEntries(orders.map((o) => [o._id, o.status]));

export function useBuyerOrderNotifications() {
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const { pathname } = useLocation();
  const isBuyer = user?.role === "buyer";

  const [orders, setOrders] = useState(null);
  // Null until this browser has seen the buyer's orders once.
  const [store, setStore] = useState(readStore);
  const [toast, setToast] = useState(null);

  const save = useCallback((update) => {
    setStore((current) => {
      const next = update(current);
      if (next && next !== current) writeStore(next);
      return next;
    });
  }, []);

  // Only the newest answer is used. One asked for before a live update can
  // come back after it, and would put back the status that has just changed
  // - so each update also makes any answer already on its way out of date.
  const latestLoad = useRef(0);
  const load = () => {
    const ticket = ++latestLoad.current;
    return getBuyerOrders().then(({ data }) => {
      if (ticket === latestLoad.current) setOrders(data);
    });
  };

  useEffect(() => {
    if (isBuyer) load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuyer]);

  useLiveRefresh(["order:changed"], () => (isBuyer ? load() : undefined));

  // Which orders are on screen right now: every one on My Orders, or the one
  // whose page is open.
  const onOrderPage = pathname.match(/^\/buyer\/orders\/([^/]+)/)?.[1];
  const onOrdersList = pathname === "/buyer/orders";
  const lookingAt = useRef(() => false);
  useEffect(() => {
    lookingAt.current = (orderId) => onOrdersList || orderId === onOrderPage;
  });

  // Live: the farmer moved an order on - say so now. The buyer's own moves
  // (ordering, cancelling) they know about already, and a change to an order
  // they are looking at they can see happen, so those count as seen at once.
  useEffect(() => {
    if (!isBuyer) return undefined;
    return subscribe("order:changed", (change) => {
      const { orderId, status } = change;
      // The order's new status is known now; the list is fetched again
      // (useLiveRefresh above) to bring in the rest of it.
      latestLoad.current += 1;
      setOrders((list) => list && list.map((o) => (o._id === orderId ? { ...o, status } : o)));
      const seenNow = change.by === "buyer" || lookingAt.current(orderId);
      const say = change.by === "farmer" && change.action === "status" && messages[status];
      if (say) setToast({ id: `${orderId}-${status}`, message: say(change) });
      if (!say && !seenNow) return;
      save(
        (s) =>
          s && {
            told: { ...s.told, [orderId]: status },
            seen: seenNow ? { ...s.seen, [orderId]: status } : s.seen,
          }
      );
    });
  }, [isBuyer, subscribe, save]);

  // Whenever the orders come in: anything moved on that hasn't been announced
  // yet (it happened while they were away) is toasted once - the newest - and
  // then remembered. The first time in this browser there is nothing to
  // compare with, so nothing is announced or counted.
  useEffect(() => {
    if (!orders) return;
    if (!store) {
      const now = statusesOf(orders);
      save(() => ({ told: now, seen: { ...now } }));
      return;
    }
    const missed = orders.find((o) => TOLD_ON_RETURN.includes(o.status) && store.told[o._id] !== o.status);
    if (missed) setToast({ id: `${missed._id}-${missed.status}`, message: messages[missed.status](missed) });
    if (orders.some((o) => store.told[o._id] !== o.status)) {
      save((s) => ({ told: { ...s.told, ...statusesOf(orders) }, seen: s.seen }));
    }
    // Only when the orders come in - `store` changing is this effect's own doing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // Looking at My Orders sees every order on it; opening one sees that one.
  useEffect(() => {
    if (!orders || !store || (!onOrdersList && !onOrderPage)) return;
    const looked = orders.filter((o) => (onOrdersList || o._id === onOrderPage) && store.seen[o._id] !== o.status);
    if (looked.length) save((s) => ({ told: s.told, seen: { ...s.seen, ...statusesOf(looked) } }));
  }, [orders, store, onOrdersList, onOrderPage, save]);

  const unseen =
    isBuyer && orders && store
      ? orders.filter((o) => !o.archived && COUNTED.includes(o.status) && store.seen[o._id] !== o.status).length
      : 0;

  const dismiss = useCallback(() => setToast(null), []);
  return { toast: isBuyer ? toast : null, dismiss, unseen };
}
