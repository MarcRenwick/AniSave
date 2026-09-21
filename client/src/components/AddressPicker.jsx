import { useEffect, useState } from "react";
import { getServiceArea, getCities } from "../services/api";

// The lists barely change, so anything fetched is kept for the life of the
// page - going back to a list you already opened is instant. A failed
// request is forgotten so "Try again" really does ask again.
const requests = new Map();
function load(key, fetcher) {
  if (!requests.has(key)) {
    requests.set(
      key,
      fetcher().then(
        ({ data }) => data,
        (err) => {
          requests.delete(key);
          throw err;
        }
      )
    );
  }
  return requests.get(key);
}

const defaultSelectClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66] disabled:bg-gray-50 disabled:text-gray-400";

// Province > Municipality/City. AniSave serves one province, so the province
// is shown fixed rather than as a choice of one, and only its municipalities
// and cities can be picked. Which province that is comes from the server, not
// from anything hard-coded here.
//
// It only ever reports the codes that were picked - the server works out the
// coordinates from them, so nobody enters a latitude or longitude, and nothing
// here reads a live location.
//
// `value` is { provinceCode, cityCode }; `onChange` gets the whole next value.
export default function AddressPicker({
  value,
  onChange,
  required = false,
  className = "grid gap-4 sm:grid-cols-2",
  labelClass = "block text-sm font-medium text-gray-700",
  selectClass = defaultSelectClass,
  idPrefix = "address",
}) {
  const { provinceCode, cityCode } = value;

  // The city list remembers which province it belongs to, so it can never show
  // one province's towns under another.
  const [area, setArea] = useState(null);
  const [cities, setCities] = useState({ for: null, list: null });
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load("service-area", getServiceArea)
      .then((data) => {
        if (!cancelled) setArea(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // The province isn't a choice, so it is filled in as soon as the server says
  // what it is. An address saved for somewhere else - from before the service
  // area narrowed - has its town cleared, since that town isn't in this
  // province's list and would otherwise sit there unselectable.
  useEffect(() => {
    if (!area || provinceCode === area.provinceCode) return;
    onChange({ provinceCode: area.provinceCode, cityCode: "" });
  }, [area, provinceCode, onChange]);

  useEffect(() => {
    if (!provinceCode) return undefined;
    let cancelled = false;
    load(`cities:${provinceCode}`, () => getCities(provinceCode))
      .then((list) => {
        if (!cancelled) setCities({ for: provinceCode, list });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [provinceCode, attempt]);

  const cityList = cities.for === provinceCode ? cities.list : null;

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  const field = (id, label, control) => (
    <div>
      <label htmlFor={`${idPrefix}-${id}`} className={labelClass}>
        {label}
      </label>
      <div className="mt-1">{control}</div>
    </div>
  );

  return (
    <div>
      <div className={className}>
        {field(
          "province",
          "Province",
          // Disabled, not hidden: people can still see which province their
          // address is in, and that it isn't theirs to change.
          <select
            id={`${idPrefix}-province`}
            value={area ? area.provinceCode : ""}
            disabled
            title={area ? `AniSave currently serves ${area.province} only` : undefined}
            className={selectClass}
          >
            {area ? (
              <option value={area.provinceCode}>{area.province}</option>
            ) : (
              <option value="">Loading...</option>
            )}
          </select>
        )}

        {field(
          "city",
          "Municipality / City",
          <select
            id={`${idPrefix}-city`}
            required={required}
            value={cityCode}
            disabled={!cityList}
            onChange={(e) => onChange({ provinceCode, cityCode: e.target.value })}
            className={selectClass}
          >
            <option value="">{cityList ? "Select municipality / city" : "Loading..."}</option>
            {(cityList || []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {failed && (
        <p className="mt-2 text-xs text-red-600">
          Couldn&apos;t load the address list.{" "}
          <button type="button" onClick={retry} className="font-semibold underline">
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
