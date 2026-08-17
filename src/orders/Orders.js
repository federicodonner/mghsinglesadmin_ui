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
          <div className="ordersHead">
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
