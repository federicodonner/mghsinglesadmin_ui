import texts from "../data/texts";
import "./sellSearchResult.css";
import foilIcon from "../images/foilIcon.svg";
import { isFoil, finishLabel } from "../utils/finishes";

export default function SellSearchResult(props) {
  return (
    <div
      className="sellSearchResult"
      onClick={() => {
        props.selectCard(props.card);
      }}
    >
      <div className="cardName">
        {props.card.cardname}
        {isFoil(props.card.variant) && (
          <img
            className="foilIcon"
            src={foilIcon}
            alt={finishLabel(props.card.variant)}
            title={finishLabel(props.card.variant)}
          />
        )}
      </div>
      <div className="versionDetails">
        {/* The set code column is `cardsetcode`; `cardset` is the relation. */}
      <span className="set">{(props.card.cardsetcode ?? "").toUpperCase()}</span>
        <span className="condition">{props.card.condition}</span>
        <span className="language">{props.card.language}</span>
        <span className="user">{props.card.player}</span>
        {/* CardKingdom reference for this exact printing and finish, so the
            shop prices against a number rather than from memory. It never
            overwrites what the shop is asking. */}
        <span className="ckReference">
          {props.card.ckretail !== null && props.card.ckretail !== undefined ? (
            <>
              {texts.CK_REFERENCE} U$S {props.card.ckretail}
              {props.card.ckbuylist !== null &&
                props.card.ckbuylist !== undefined && (
                  <span className="ckBuylist">
                    {" "}
                    ({texts.CK_BUYLIST} {props.card.ckbuylist})
                  </span>
                )}
            </>
          ) : (
            <span className="ckMissing">{texts.CK_NONE}</span>
          )}
        </span>
      </div>
      <div className="divider"></div>
    </div>
  );
}
