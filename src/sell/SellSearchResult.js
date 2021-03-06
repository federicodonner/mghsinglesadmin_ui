import texts from "../data/texts";
import "./sellSearchResult.css";
import foilIcon from "../images/foilIcon.svg";

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
        {props.card.foil == 1 && (
          <img className="foilIcon" src={foilIcon} alt="foil" />
        )}
      </div>
      <div className="versionDetails">
        <span className="set">{props.card.cardset.toUpperCase()}</span>
        <span className="condition">{props.card.condition}</span>
        <span className="language">{props.card.language}</span>
        <span className="user">{props.card.player}</span>
      </div>
      <div className="divider"></div>
    </div>
  );
}
