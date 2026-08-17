// Card finishes, using Scryfall's vocabulary verbatim: nonfoil, foil, etched.
//
// Scryfall records finishes per PRINTING, and half of all printings exist in
// only one of them, so the choice offered for a card must come from that
// printing rather than from a fixed list.
//
// Note that nonfoil and foil SHARE a printing and therefore share an image —
// which is why finish is a separate control rather than another version tile.
// Etched is usually its own printing with its own collector number and art, so
// it normally appears as a tile of its own.
import texts from "../data/texts";

export const DEFAULT_FINISH = "nonfoil";

// Anything that is not plain nonfoil is a foil of some kind.
export const isFoil = (finish) => Boolean(finish) && finish !== DEFAULT_FINISH;

// Human label, falling back to the raw value for any finish added upstream.
export const finishLabel = (finish) =>
  texts[`VARIANT_${String(finish).replace(/-/g, "_")}`] ?? finish;

// What a printing can actually be. A printing with nothing recorded still needs
// to be usable, so it falls back to nonfoil.
export function finishesFor(version) {
  const finishes = version?.finishes ?? [];
  return finishes.length ? finishes : [DEFAULT_FINISH];
}
