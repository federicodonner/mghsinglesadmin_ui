import React, { useState, useEffect } from "react";
import { toast } from "../utils/toast";
import texts from "../data/texts";
import { accessAPI } from "../utils/fetchFunctions";
import { isFoil, finishLabel } from "../utils/finishes";
import { useExchangeRate, pesosLive } from "../utils/exchange";
import { locationLabel } from "../utils/locationLabel";
import "./orders.css";
import Button from "@mui/material/Button";
import Title from "../elementos/Title";

// Orders a customer confirmed from their cart, waiting to be assembled. Each
// copy is reserved (the stock is already held) but still sits in its pocket;
// this is where the shop goes to fetch them, one card at a time, and mark each
// as separated. When the last copy of an order is pulled it leaves this queue
// and becomes a normal pick-up.
export default function PrepareQueue() {
  const [orders, setOrders] = useState([]);
  const rate = useExchangeRate();

  function load() {
    accessAPI(
      "GET",
      "admin/prepare",
      null,
      (response) => setOrders(response ?? []),
      () => setOrders([])
    );
  }

  useEffect(() => {
    load();
  }, []);

  function pull(copy) {
    accessAPI(
      "POST",
      `admin/prepare/${copy.placementid}/pull`,
      null,
      () => load(),
      (response) => toast(response.message)
    );
  }

  const total = orders.reduce((n, o) => n + o.copies.length, 0);

  return (
    <>
      <Title
        title={texts.PREPARE_TITLE}
        subtitle={texts.PREPARE_HINT}
        tags={total > 0 ? [{ label: String(total), color: "secondary" }] : []}
      />
      {!orders.length && <div className="emptyState">{texts.NO_PREPARE}</div>}
      {orders.map((order) => (
        <div className="matchCard" key={order.orderid}>
          <div className="matchPlayer">{order.name}</div>
          {order.copies.map((copy) => (
            <div className="matchBlock" key={copy.placementid}>
              <div className="matchRow">
                {copy.image && (
                  <img className="matchThumb" src={copy.image} alt={copy.name} />
                )}
                <span className="lineName">{copy.name}</span>
                <span className="lineSet">
                  {(copy.cardsetcode ?? "").toUpperCase()}
                </span>
                {isFoil(copy.variant) && (
                  <span className="lineMeta">{finishLabel(copy.variant)}</span>
                )}
                <span className="linePrice">{pesosLive(copy.price, rate)}</span>
                <Button size="small" onClick={() => pull(copy)}>
                  {texts.SET_ASIDE}
                </Button>
              </div>
              <div className="matchWhere">
                <span className="matchWhereLabel">{texts.WHERE_IS_IT}:</span>
                {copy.location ? (
                  <span>{locationLabel(copy.location)}</span>
                ) : (
                  <span className="matchNoLocation">{texts.NO_LOCATION}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
