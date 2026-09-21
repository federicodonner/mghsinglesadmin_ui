// Optimistic rewrites of a loaded container.
//
// Duplicating and removing a copy used to wait for the API and the reload
// before anything moved on screen — a click that does nothing for half a
// second reads as a click that did nothing. These helpers patch the loaded
// unit the way the server WILL, so the editor shows the result immediately;
// the reload that follows every successful mutation replaces the guess with
// the truth (same shape, so nothing visibly changes), and a failure undoes
// the guess with a toast saying why.
//
// The new copy carries a NEGATIVE placementid until the reload brings the
// real one: negative ids collide with nothing real, and the mutation
// handlers refuse to act on one — a copy the server has not confirmed yet
// cannot be duplicated or removed again.

// The unit with one more copy of the placement's card, born where the API
// puts a duplicate: bottom of the same pocket, right after it in a box,
// beside it in the stand-by area.
export function withDuplicate(unit, placementid, tempid) {
  const clone = (card) => ({ ...card, placementid: tempid });

  const standbyAt =
    unit.standby?.findIndex((c) => c.placementid === placementid) ?? -1;
  if (standbyAt >= 0) {
    const standby = [...unit.standby];
    standby.splice(standbyAt + 1, 0, clone(standby[standbyAt]));
    return { ...unit, standby };
  }

  if (unit.pages) {
    let found = false;
    const pages = unit.pages.map((page) => {
      if (
        found ||
        !page?.pockets?.some((pk) =>
          pk.cards.some((c) => c.placementid === placementid)
        )
      ) {
        return page;
      }
      found = true;
      return {
        ...page,
        pockets: page.pockets.map((pk) => {
          const original = pk.cards.find(
            (c) => c.placementid === placementid
          );
          // Bottom of the stack — the API gives the copy the next depth.
          return original
            ? { ...pk, cards: [...pk.cards, clone(original)] }
            : pk;
        }),
      };
    });
    if (found) return { ...unit, pages };
  }

  const boxAt =
    unit.cards?.findIndex((c) => c.placementid === placementid) ?? -1;
  if (boxAt >= 0) {
    const cards = [...unit.cards];
    cards.splice(boxAt + 1, 0, clone(cards[boxAt]));
    return { ...unit, cards };
  }

  return unit;
}

// The unit without one placement, wherever it sits — the stand-by area, a
// pocket, or a box. Removes a failed duplicate's provisional copy just as
// well as a real one being taken out.
export function withoutPlacement(unit, placementid) {
  const gone = (c) => c.placementid !== placementid;

  if (unit.standby?.some((c) => !gone(c))) {
    return { ...unit, standby: unit.standby.filter(gone) };
  }
  if (
    unit.pages?.some((page) =>
      page?.pockets?.some((pk) => pk.cards.some((c) => !gone(c)))
    )
  ) {
    return {
      ...unit,
      pages: unit.pages.map((page) =>
        page?.pockets?.some((pk) => pk.cards.some((c) => !gone(c)))
          ? {
              ...page,
              pockets: page.pockets.map((pk) =>
                pk.cards.some((c) => !gone(c))
                  ? { ...pk, cards: pk.cards.filter(gone) }
                  : pk
              ),
            }
          : page
      ),
    };
  }
  if (unit.cards?.some((c) => !gone(c))) {
    return { ...unit, cards: unit.cards.filter(gone) };
  }
  return unit;
}
