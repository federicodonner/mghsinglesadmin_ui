import { useState, useEffect } from "react";
import { accessAPI } from "./fetchFunctions";

// The pesos-per-dollar rate the shop maintains, or null while loading and
// when the shop has not configured one. Null means "show dollars only" —
// never a $0 that would read as free.
//
// Fetched per page mount rather than cached module-wide, so a rate the owner
// just changed shows up on the next page visit without a full reload.
export function useExchangeRate() {
  const [rate, setRate] = useState(null);
  useEffect(() => {
    accessAPI(
      "GET",
      "store/exchangerate",
      null,
      (response) => setRate(response.rate ?? null),
      () => setRate(null)
    );
  }, []);
  return rate;
}

// A dollar amount converted at `rate`, as display text ("$ 1.234"), or null
// when either side is missing. Whole pesos: at rates in the tens, centavos
// are noise nobody can pay anyway.
export function livePesos(usd, rate) {
  if (rate == null || usd == null) return null;
  return formatPesos(Math.round(Number(usd) * rate));
}

// A peso amount already frozen on an order line, as display text.
export function formatPesos(value) {
  if (value == null) return null;
  return `$ ${Math.round(Number(value)).toLocaleString("es-UY")}`;
}

// "U$S 4.99 · $ 202" from a LIVE dollar price and today's rate — for stock
// on shelves, where pesos follow the market until the copy is bagged.
export function dualLive(usd, rate) {
  if (usd == null) return "U$S ?";
  const pesos = livePesos(usd, rate);
  return `U$S ${usd}${pesos ? ` · ${pesos}` : ""}`;
}

// The same shape from an order line's FROZEN pair. No rate involved: both
// numbers were snapshotted the day the copy was bagged.
export function dualFrozen(price, pricepesos) {
  const pesos = formatPesos(pricepesos);
  return `U$S ${price}${pesos ? ` · ${pesos}` : ""}`;
}
