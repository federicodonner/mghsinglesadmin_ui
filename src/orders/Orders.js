import React, { useState, useEffect } from "react";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import { isFoil, finishLabel } from "../utils/finishes";
import "./orders.css";

function formatDate(seconds) {
  if (!seconds) return "";
  const date = new Date(seconds * 1000);
  return (
    String(date.getDate()).padStart(2, "0") +
    "/" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "/" +
    date.getFullYear()
  );
}

// The shop's side of reservations: who is holding what, and the two buttons
// that close an order out. Completing writes real sale rows, so the consignor
// is owed their share exactly as with a counter sale.
export default function Orders() {
  const [loader, setLoader] = useState(true);
  const [orders, setOrders] = useState([]);
  const [demand, setDemand] = useState([]);
  const [matches, setMatches] = useState([]);
  const [pendingOnly, setPendingOnly] = useState(true);

  const navigate = useNavigate();

  function bail(response) {
    alert(response.message);
    logout();
    navigate("/login");
  }

  function load() {
    accessAPI(
      "GET",
      "admin/order",
      null,
      (response) => {
        setOrders(response);
        setLoader(false);
      },
      bail
    );
    accessAPI(
      "GET",
      "admin/match",
      null,
      (response) => setMatches(response),
      () => setMatches([])
    );
    accessAPI(
      "GET",
      "admin/wishlist",
      null,
      (response) => setDemand(response),
      () => setDemand([])
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function actOnMatch(match, action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    accessAPI(
      "POST",
      `admin/match/${match.id}/${action}`,
      null,
      () => load(),
      (response) => alert(response.message)
    );
  }

  function act(order, action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    accessAPI(
      "POST",
      `admin/order/${order.id}/${action}`,
      null,
      () => load(),
      (response) => alert(response.message)
    );
  }

  const shown = pendingOnly
    ? orders.filter((order) => order.status === "pending")
    : orders;

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      {loader && <Loader color="blue" />}
      {!loader && (
        <div className="ordersContainer">
          {/* Placed above the order queue deliberately: this is the work the
              shop would otherwise never notice, since a match appears without
              anyone doing anything. */}
          <div className="ordersHead">
            <span className="title">{texts.MATCHES_TITLE}</span>
            {matches.length > 0 && (
              <span className="matchBadge">
                {matches.reduce((n, p) => n + p.matches.length, 0)}
              </span>
            )}
          </div>
          <div className="demandHint">{texts.MATCHES_HINT}</div>
          {!matches.length && (
            <div className="emptyState">{texts.NO_MATCHES}</div>
          )}
          {matches.map((person) => (
            <div className="matchCard" key={person.playerid}>
              <div className="matchPlayer">
                {texts.BAG_FOR} {person.name}
              </div>
              {person.matches.map((match) => (
                <div className="matchRow" key={match.id}>
                  {match.image && (
                    <img className="matchThumb" src={match.image} alt={match.name} />
                  )}
                  <span className="lineName">{match.name}</span>
                  <span className="lineSet">
                    {(match.cardsetcode ?? "").toUpperCase()}
                  </span>
                  <span className="lineMeta">{match.condition}</span>
                  <span className="lineMeta">{match.language}</span>
                  {isFoil(match.variant) && (
                    <span className="lineMeta">{finishLabel(match.variant)}</span>
                  )}
                  {/* A withdrawal is the customer's own consigned card: it goes
                      in the bag but nothing is charged for it. */}
                  <span
                    className={
                      match.kind === "withdrawal"
                        ? "matchKind withdrawal"
                        : "matchKind purchase"
                    }
                    title={
                      match.kind === "withdrawal"
                        ? texts.MATCH_WITHDRAWAL_HINT
                        : undefined
                    }
                  >
                    {match.kind === "withdrawal"
                      ? texts.MATCH_WITHDRAWAL
                      : texts.MATCH_PURCHASE}
                  </span>
                  <span className="linePrice">
                    {match.kind === "withdrawal"
                      ? "—"
                      : `U$S ${match.price ?? "?"}`}
                  </span>
                  <button
                    className="dark small"
                    onClick={() => actOnMatch(match, "setaside")}
                  >
                    {texts.SET_ASIDE}
                  </button>
                  <button
                    className="light small"
                    onClick={() =>
                      actOnMatch(match, "dismiss", texts.CONFIRM_DISMISS_MATCH)
                    }
                  >
                    {texts.DISMISS_MATCH}
                  </button>
                </div>
              ))}
            </div>
          ))}

          <div className="ordersHead ordersHeadSpaced">
            <span className="title">{texts.ORDERS_TITLE}</span>
            <button
              className="light small"
              onClick={() => setPendingOnly(!pendingOnly)}
            >
              {pendingOnly ? texts.SHOW_ALL : texts.SHOW_PENDING}
            </button>
          </div>

          {!shown.length && <div className="emptyState">{texts.NO_ORDERS}</div>}

          {shown.map((order) => (
            <div className={`orderCard ${order.status}`} key={order.id}>
              <div className="orderHeader">
                <span className={`orderStatus ${order.status}`}>
                  {texts[`ORDER_STATUS_${order.status}`] ?? order.status}
                </span>
                <span className="orderPlayer">{order.player?.name}</span>
                <span className="orderDate">{formatDate(order.created)}</span>
                {order.status === "pending" && order.expires && (
                  <span className="orderExpires">
                    {texts.ORDER_EXPIRES} {formatDate(order.expires)}
                  </span>
                )}
                <span className="orderTotal">
                  {texts.ORDER_TOTAL} U$S {order.total}
                </span>
              </div>

              {order.note && <div className="orderNote">{order.note}</div>}

              <div className="orderLines">
                {order.lines.map((line) => (
                  <div className="orderLine" key={line.id}>
                    <span className="lineQuantity">{line.quantity}</span>
                    <span className="lineName">{line.name}</span>
                    <span className="lineSet">
                      {(line.cardsetcode ?? "").toUpperCase()}
                    </span>
                    <span className="lineMeta">{line.condition}</span>
                    <span className="lineMeta">{line.language}</span>
                    {isFoil(line.variant) && (
                      <span className="lineMeta">{finishLabel(line.variant)}</span>
                    )}
                    <span className="linePrice">U$S {line.price}</span>
                  </div>
                ))}
              </div>

              {/* Only a live reservation can be acted on. */}
              {order.status === "pending" && (
                <div className="orderActions">
                  <button
                    className="dark"
                    onClick={() =>
                      act(order, "complete", texts.CONFIRM_COMPLETE)
                    }
                  >
                    {texts.COMPLETE_ORDER}
                  </button>
                  <button
                    className="light"
                    onClick={() => act(order, "extend")}
                  >
                    {texts.EXTEND_ORDER}
                  </button>
                  <button
                    className="light"
                    onClick={() =>
                      act(order, "cancel", texts.CONFIRM_CANCEL_ORDER)
                    }
                  >
                    {texts.CANCEL_ORDER}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* What customers are asking for — the list to read before taking
              cards on consignment. */}
          <div className="title demandTitle">{texts.DEMAND_TITLE}</div>
          <div className="demandHint">{texts.DEMAND_HINT}</div>
          {!demand.length && <div className="emptyState">{texts.NO_DEMAND}</div>}
          {demand.map((entry) => (
            <div className="demandRow" key={entry.name}>
              <span className="demandName">{entry.name}</span>
              <span className="demandCount">
                {texts.WANTED_BY} {entry.wanted}
              </span>
              <span className="demandWanters">{entry.wanters.join(", ")}</span>
              {/* A customer whose filters nothing on the shelf satisfies is the
                  actionable case, so it is called out separately from the raw
                  stock count. */}
              {entry.unsatisfied.length > 0 && (
                <span className="demandStock out">
                  {texts.UNSATISFIED}: {entry.unsatisfied.join(", ")}
                </span>
              )}
              {entry.unsatisfied.length === 0 && (
                <span className="demandStock in">{texts.SATISFIED}</span>
              )}
              <span className="demandCount">
                {texts.IN_STOCK_COUNT}: {entry.inStock}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
