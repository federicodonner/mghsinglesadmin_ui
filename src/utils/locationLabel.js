import texts from "../data/texts";

// One line of "where the card physically is", in the terms that container
// supports: a binder answers to page and pocket, a sorted box to a position,
// an unsorted box only to its own name. Shared by the refile queue and the
// till so the two never describe the same pocket differently.
export function locationLabel(loc) {
  if (loc.storagetype === "binder" && loc.page != null) {
    return `${loc.storagename} — ${texts.PAGE} ${loc.page}, ${texts.IN_POCKET} ${loc.pocket}${
      loc.depth > 1 ? ` (${texts.DEPTH} ${loc.depth})` : ""
    }`;
  }
  if (loc.storagetype === "binder") {
    // No page: the copy sits in the binder's stand-by area, waiting to be
    // filed — still physically in the binder.
    return `${loc.storagename} — ${texts.STANDBY_TITLE}`;
  }
  if (loc.storagetype === "sorted_box" && loc.sequence != null) {
    return `${loc.storagename} — ${texts.POSITION_IN_BOX} ${loc.sequence}`;
  }
  return loc.storagename;
}
