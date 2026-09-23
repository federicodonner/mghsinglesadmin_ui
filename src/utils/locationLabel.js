import texts from "../data/texts";

// One line of "where the card physically is", in the terms that container
// supports: a binder answers to page and pocket, a sorted box to a position,
// an edition box to the card's collector number, and an unsorted box only to
// its own name. Shared by the refile queue, the match queue, the orders page
// and the till so no two of them describe the same pocket differently.
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
  // An edition box stores no position: it is filed in collector-number order,
  // so the number printed on the card is the address.
  if (loc.storagetype === "edition_box" && loc.collectornumber != null) {
    return `${loc.storagename} — ${texts.EDITION_COL_NUMBER} ${loc.collectornumber}`;
  }
  return loc.storagename;
}
