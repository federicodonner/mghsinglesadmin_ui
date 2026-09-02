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

// PESOS-ONLY for the counter (2026-09-02, Federico): what the customer is
// charged shows in pesos. A LIVE price converts at today's rate; falls back to
// dollars only if the shop has no rate configured. Pricing stays in dollars —
// that is the internal currency staff set prices in.
export function pesosLive(usd, rate) {
  if (usd == null) return null;
  return livePesos(usd, rate) ?? `U$S ${usd}`;
}

// PESOS-ONLY from an order line's FROZEN peso snapshot; falls back to the
// frozen dollar amount for lines that predate the peso column.
export function pesosFrozen(price, pricepesos) {
  if (pricepesos == null) return price == null ? null : `U$S ${price}`;
  return formatPesos(pricepesos);
}

// Pesos for an order amount: the FROZEN peso snapshot when it exists (the true
// amount quoted at bagging), otherwise a LIVE conversion of the dollar amount
// at today's rate — so orders placed before the shop had pesos still read in
// pesos. Dollars only as a last resort, when the shop has no rate.
export function pesosFrozenOrLive(price, pricepesos, rate) {
  if (pricepesos != null) return formatPesos(pricepesos);
  if (price == null) return null;
  if (rate != null) return formatPesos(Math.round(Number(price) * rate));
  return `U$S ${price}`;
}
