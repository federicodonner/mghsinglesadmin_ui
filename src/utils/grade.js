// Condition and language, as the back office shows them.
//
// Only the shop grades cards, and only the back office shows the grade. Nearly
// every card is near-mint English, so those two are the unmarked case: a row
// says something only when the copy is NOT that.
export const DEFAULT_CONDITION = "NM";
export const DEFAULT_LANGUAGE = "Inglés";

// The parts worth showing for a card or line carrying `condition` and
// `language` names: [] for a near-mint English copy.
export function gradeParts(card) {
  const parts = [];
  if (card?.condition && card.condition !== DEFAULT_CONDITION) {
    parts.push(card.condition);
  }
  if (card?.language && card.language !== DEFAULT_LANGUAGE) {
    parts.push(card.language);
  }
  return parts;
}

export const gradeLabel = (card) => gradeParts(card).join(" · ");
