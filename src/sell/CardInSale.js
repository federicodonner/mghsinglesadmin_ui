import React, { useState, useEffect, useRef } from "react";
import texts from "../data/texts";
import "./cardInSale.css";
import foilIcon from "../images/foilIcon.svg";

export default function CardInSale(props) {
  const [quantitySelector, setQuantitySelector] = useState([]);

  const quantityRef = useRef(null);
  const priceRef = useRef(null);

  // When the component loads, put together the quantity selector
  useEffect(() => {
    var quantitySelectorForStore = [];
    for (var i = 1; i <= props.card.quantity; i++) {
      quantitySelectorForStore.push(i);
    }
    setQuantitySelector(quantitySelectorForStore);

    // If there are already values in the card, load them
    priceRef.current.value = props.card.price || null;
  }, [props]);

  // Update the quantity selector if the card has values already
  useEffect(() => {
    if (quantitySelector.length) {
      quantityRef.current.value = props.card.saleQuantity || null;
    }
  }, [quantitySelector]);

  return (
    <div className={props.showBorder ? "cardInSale border" : "cardInSale"}>
      <div className="name">
        <span>
          {props.card.cardName.indexOf(" // ") === -1
            ? props.card.cardName
            : props.card.cardName.split(" // ")[0]}
        </span>
        {props.card.foil == 1 && (
          <span>
            <img src={foilIcon} className="foilIcon" alt="foil" />
          </span>
        )}
      </div>
      <div className="set">{props.card.cardSet.toUpperCase()}</div>
      <div className="language">{props.card.language}</div>
      <div className="condition">{props.card.condition}</div>
      <div className="user">{props.card.user}</div>
      <div className="quantity">
        <select
          name="quantity"
          id="quantity"
          ref={quantityRef}
          onChange={() => {
            props.updateQuantity(props.card.id, quantityRef.current.value);
          }}
        >
          {quantitySelector.map((quantity) => {
            return (
              <option value={quantity} key={quantity}>
                {quantity}
              </option>
            );
          })}
        </select>
      </div>
      <div className="price">
        U$S{" "}
        <input
          type="text"
          ref={priceRef}
          className={!props.card.price ? "error" : ""}
          onChange={() => {
            props.updatePrice(props.card.id, priceRef.current.value);
          }}
        />
      </div>
      <div
        className="deleteButton"
        onClick={() => {
          props.deleteCard(props.card.id);
        }}
      >
        X
      </div>
    </div>
  );
}
