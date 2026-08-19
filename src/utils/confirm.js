// confirmDialog(message) — what window.confirm did, as a promise of a boolean.
//
// Same module-level arrangement as toast.js and for the same reason: confirms
// fire from plain event handlers all over the app, and the single <Confirmer/>
// mounted in App is the one place a dialog can actually render. Callers await
// the answer, so the migration from window.confirm is one keyword:
//
//   if (!(await confirmDialog(texts.SURE))) return;
let listener = null;

export function setConfirmListener(fn) {
  listener = fn;
}

export function confirmDialog(message) {
  // Before the Confirmer mounts (or in tests) there is nothing to show; the
  // native dialog is a truthful fallback rather than silently answering "no".
  if (!listener) return Promise.resolve(window.confirm(message));
  return listener(message);
}
