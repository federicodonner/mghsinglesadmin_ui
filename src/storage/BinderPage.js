import "./storage.css";
import texts from "../data/texts";

// One 3x3 binder page. Each pocket holds a stack, so the cards are drawn
// overlapping with the front card fully visible and the ones behind it peeking
// out — that is what the pocket actually looks like.
//
// `page` may be null, which is how the left half of the first spread is drawn:
// page 1 has nothing facing it, like opening a real binder.
export default function BinderPage(props) {
  const { page, onPocketClick, onCardClick } = props;

  if (!page) {
    return <div className="binderPage empty" />;
  }

  return (
    <div className="binderPage">
      <div className="binderPageNumber">
        {texts.PAGE} {page.page}
      </div>
      <div className="pocketGrid">
        {page.pockets.map((pocket) => (
          <div
            className={
              pocket.cards.length ? "pocket filled" : "pocket"
            }
            key={pocket.pocket}
            onClick={
              onPocketClick && !pocket.cards.length
                ? () => onPocketClick(page.page, pocket.pocket)
                : undefined
            }
          >
            {!pocket.cards.length && (
              <span className="pocketEmpty">{pocket.pocket}</span>
            )}
            {pocket.cards.map((card, index) => (
              <div
                className={card.isMatch ? "cardInPocket match" : "cardInPocket"}
                key={card.placementid}
                // Stack them back-to-front with a small offset so a pocket
                // holding several cards reads as a stack, not one card.
                style={{
                  zIndex: pocket.cards.length - index,
                  transform: `translate(${index * 6}px, ${index * 6}px)`,
                }}
                title={`${card.name} · ${card.condition ?? ""} ${
                  card.language ?? ""
                } · ${card.owner ?? ""}`}
                onClick={
                  onCardClick ? () => onCardClick(card, page.page) : undefined
                }
              >
                {card.image ? (
                  <img src={card.image} alt={card.name} />
                ) : (
                  <span className="cardInPocketName">{card.name}</span>
                )}
              </div>
            ))}
            {pocket.cards.length > 1 && (
              <span className="pocketCount">{pocket.cards.length}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
