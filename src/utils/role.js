// The signed-in account's role, as reported by the API.
//
// Cached in localStorage purely so the menu can render without waiting for a
// round trip. It is NOT a security boundary — every owner-only route is gated
// server-side, and editing this value in a browser buys nothing but a menu
// item that returns 403.
export const ROLE_KEY = "mghsinglesRole";

export function storeRole(role) {
  if (role) window.localStorage.setItem(ROLE_KEY, role);
}

export function readRole() {
  return window.localStorage.getItem(ROLE_KEY);
}

export function clearRole() {
  window.localStorage.removeItem(ROLE_KEY);
}

// Staff and owner both work the shop; only owner touches money, pricing and
// who has which role.
export const isStaff = (role) => role === "staff" || role === "owner";
export const isOwner = (role) => role === "owner";
