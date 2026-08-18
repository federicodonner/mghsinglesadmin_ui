import React, { useState, useEffect, useRef } from "react";
import texts from "../data/texts";
import "./cardInSale.css";
import foilIcon from "../images/foilIcon.svg";
import TextField from "@mui/material/TextField";

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
          {props.card.cardname.indexOf(" // ") === -1
            ? props.card.cardname
            : props.card.cardname.split(" // ")[0]}
        </span>
        {props.card.foil == 1 && (
          <span>
            <img src={foilIcon} className="foilIcon" alt="foil" />
          </span>
        )}
      </div>
      {/* The set code column is `cardsetcode`; `cardset` is the relation. */}
      <div className="set">{(props.card.cardsetcode ?? "").toUpperCase()}</div>
      <div className="language">{props.card.language}</div>
      <div className="condition">{props.card.condition}</div>
      <div className="user">{props.card.player}</div>
      <div className="quantity">
        <TextField select SelectProps={{ native: true }}
          name="quantity"
          id="quantity"
          inputRef={quantityRef}
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
        </TextField>
      </div>
      <div className="price">
        U$S{" "}
        <TextField
          type="text"
          inputRef={priceRef}
          error={!props.card.price}
          size="small"
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
