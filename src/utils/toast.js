// toast(message) — what window.alert used to do, minus stealing the thread.
//
// A module-level function rather than a context hook on purpose: toast() was
// called from plain fetch callbacks all over the app, and a hook would force
// every one of those components to thread a value down to the call site. The
// single <Toaster/> in App registers itself here; anything can then fire.
let listener = null;

export function setToastListener(fn) {
  listener = fn;
}

export function toast(message, severity = "error") {
  // Before the Toaster mounts (or in tests) there is nowhere to show it;
  // dropping the message beats crashing, but keep it findable.
  if (listener) listener(message, severity);
  else console.warn("toast before Toaster mounted:", message);
}
