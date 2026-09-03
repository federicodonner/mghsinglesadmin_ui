import React, { useState, useEffect } from "react";
import { toast } from "../utils/toast";
import { confirmDialog } from "../utils/confirm";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import { isFoil, finishLabel } from "../utils/finishes";
import {
  useExchangeRate,
  formatPesos,
  pesosFrozenOrLive,
} from "../utils/exchange";
import Title from "../elementos/Title";
import SideForm from "../elementos/SideForm";
import "./orders.css";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const money = (value) => `U$S ${Number(value).toFixed(2)}`;

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
  // Where the cards from a just-cancelled bag have to go back to.
  const [refile, setRefile] = useState(null);
  const [pendingOnly, setPendingOnly] = useState(true);
  // The charge sidebar: {order, credit} while it is open, credit null while
  // the customer's balance is still loading.
  const [charging, setCharging] = useState(null);
  const [method, setMethod] = useState("cash");
  // Everything the customer touches — order totals AND their store credit — is
  // shown in pesos, converted at today's rate. Frozen order pesos win when they
  // exist; credit (a dollar balance) is converted live.
  const rate = useExchangeRate();
  const pesos = (usd) =>
    rate != null ? formatPesos(Math.round(Number(usd) * rate)) : money(usd);

  const navigate = useNavigate();

  function bail(response) {
    toast(response.message);
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
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One line of "where the card is", in the terms that container supports.
  function locationLabel(location) {
    if (location.storagetype === "binder") {
      return `${location.storagename} — ${texts.PAGE} ${location.page}, ${texts.IN_POCKET} ${location.pocket}${
        location.depth > 1 ? ` (${texts.DEPTH} ${location.depth})` : ""
      }`;
    }
    if (location.storagetype === "sorted_box") {
      return `${location.storagename} — ${texts.POSITION_IN_BOX} ${location.sequence}`;
    }
    return location.storagename;
  }

  async function act(order, action, confirmText, body) {
    if (confirmText && !(await confirmDialog(confirmText))) return;
    accessAPI(
      "POST",
      `admin/order/${order.id}/${action}`,
      body ?? null,
      (response) => {
        // Cancelling empties a bag, so say where each card goes back. Shown as
        // a panel rather than an alert, which would be dismissed and lost
        // before anyone had walked to the shelf.
        if (response?.refile?.length) setRefile(response.refile);
        // Paying with credit reports the split, so the till knows what cash
        // to actually take.
        if (response?.creditused !== undefined) {
          toast(
            `${response.message} ${texts.CREDIT_USED} ${pesos(response.creditused)}` +
              (Number(response.cashdue) > 0
                ? ` · ${texts.CASH_DUE} ${pesos(response.cashdue)}`
                : ""),
            "success"
          );
        }
        setCharging(null);
        load();
      },
      (response) => toast(response.message)
    );
  }

  // Take one card out of a pending bag. Copies already pulled show up on the
  // refile panel with their coordinates; the total recomputes from the lines
  // that remain, and removing the last line cancels the order.
  async function removeLine(order, line) {
    if (!(await confirmDialog(texts.CONFIRM_REMOVE_LINE))) return;
    accessAPI(
      "DELETE",
      `admin/order/${order.id}/line/${line.id}`,
      null,
      (response) => {
        if (response?.refile?.length) setRefile(response.refile);
        toast(response.message, "success");
        load();
      },
      (response) => toast(response.message)
    );
  }

  // Charging an order with a customer behind it opens the sidebar: cash, or
  // the credit the store owes them for their own sold cards. Counter bags and
  // all-withdrawal bags have nothing to choose, so they keep the plain
  // confirmation.
  function startCharge(order) {
    if (!order.player || Number(order.total) <= 0) {
      act(order, "complete", texts.CONFIRM_COMPLETE);
      return;
    }
    setMethod("cash");
    setCharging({ order, saleMoney: null, storeCredit: null });
    accessAPI(
      "GET",
      `admin/credit/${order.player.id}`,
      null,
      (response) =>
        setCharging((current) =>
          current?.order.id === order.id
            ? {
                ...current,
                saleMoney: Number(response.saleMoney),
                storeCredit: Number(response.storeCredit),
              }
            : current
        ),
      () =>
        setCharging((current) =>
          current?.order.id === order.id
            ? { ...current, saleMoney: 0, storeCredit: 0 }
            : current
        )
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
          {/* The match queue lives on Home now — it is the first thing a
              shift should see, not an appendix to the order list. */}

          {/* Left on screen until dismissed: it is a physical to-do. */}
          {refile && (
            <div className="refilePanel">
              <div className="refileTitle">{texts.REFILE_TITLE}</div>
              <div className="demandHint">{texts.REFILE_HINT}</div>
              {refile.map((item) => (
                <div className="refileRow" key={item.placementid}>
                  <span className="lineName">{item.name}</span>
                  <span className="lineSet">
                    {(item.cardsetcode ?? "").toUpperCase()}
                  </span>
                  <span className="refileWhere">{locationLabel(item)}</span>
                </div>
              ))}
              <Button size="small" onClick={() => setRefile(null)}>
                {texts.REFILE_DONE}
              </Button>
            </div>
          )}

          <Title
            title={texts.ORDERS_TITLE}
            buttons={[
              {
                label: pendingOnly ? texts.SHOW_ALL : texts.SHOW_PENDING,
                variant: "outlined",
                onClick: () => setPendingOnly(!pendingOnly),
              },
            ]}
          />

          {!shown.length && <div className="emptyState">{texts.NO_ORDERS}</div>}

          {shown.map((order) => (
            <div className={`orderCard ${order.status}`} key={order.id}>
              <div className="orderHeader">
                {/* A pending card IS the pick-up list, so "Reservado" and the
                    date said nothing; status and date only matter for history
                    rows, where they tell closed orders apart. */}
                {order.status !== "pending" && (
                  <span className={`orderStatus ${order.status}`}>
                    {texts[`ORDER_STATUS_${order.status}`] ?? order.status}
                  </span>
                )}
                {/* A bag with nobody behind it was rung up at the till. */}
                <span className="orderPlayer">
                  {order.player?.name ?? texts.SELL_TITLE}
                </span>
                {order.status !== "pending" && (
                  <span className="orderDate">{formatDate(order.created)}</span>
                )}
                <span className="orderTotal">
                  {texts.ORDER_TOTAL}{" "}
                  {pesosFrozenOrLive(order.total, order.totalpesos, rate)}
                </span>
              </div>
              <div className="orderLines">
                {order.lines.map((line) => (
                  <div className="orderLine" key={line.id}>
                    <span className="lineQuantity">{line.quantity}</span>
                    <span className="lineName">{line.name}</span>
                    <span className="lineSet">
                      {(line.cardsetcode ?? "").toUpperCase()}
                    </span>
                    {isFoil(line.variant) && (
                      <span className="lineMeta">{finishLabel(line.variant)}</span>
                    )}
                    <span className="linePrice">
                      {pesosFrozenOrLive(line.price, line.pricepesos, rate)}
                    </span>
                    {order.status === "pending" && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => removeLine(order, line)}
                      >
                        {texts.REMOVE_LINE}
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Only a live reservation can be acted on. */}
              {order.status === "pending" && (
                <div className="orderActions">
                  <Button onClick={() => startCharge(order)}>
                    {texts.COMPLETE_ORDER}
                  </Button>
                  <Button variant="outlined" color="error"
 onClick={() =>
 act(order, "cancel", texts.CONFIRM_CANCEL_ORDER)
 }
 >
                    {texts.CANCEL_ORDER}
                  </Button>
                </div>
              )}
            </div>
          ))}

        </div>
      )}

      {/* How is this order being paid: cash across the counter, or the credit
          the store owes this customer for their own sold cards. Credit covers
          what it can and the sidebar says the cash remainder up front, so
          nobody discovers it at the till. */}
      <SideForm
        open={Boolean(charging)}
        onClose={() => setCharging(null)}
        title={texts.CHARGE_TITLE}
      >
        {charging && (
          <Stack spacing={2}>
            <Typography variant="body2">
              {charging.order.player?.name} — {texts.ORDER_TOTAL}{" "}
              <strong>
                {pesosFrozenOrLive(
                  charging.order.total,
                  charging.order.totalpesos,
                  rate
                )}
              </strong>
            </Typography>
            {/* Both balances, kept apart. Store credit is spent first (it can
                only be spent, never cashed out), then the sale money. */}
            <Box>
              <Typography variant="body2" color="text.secondary">
                {texts.SALE_MONEY_SHORT}{" "}
                {charging.saleMoney === null ? "…" : pesos(charging.saleMoney)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {texts.STORE_CREDIT_SHORT}{" "}
                {charging.storeCredit === null ? "…" : pesos(charging.storeCredit)}
              </Typography>
            </Box>
            <RadioGroup
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <FormControlLabel
                value="cash"
                control={<Radio size="small" />}
                label={texts.PAY_CASH}
              />
              <FormControlLabel
                value="credit"
                control={<Radio size="small" />}
                disabled={
                  !(Number(charging.saleMoney) || Number(charging.storeCredit))
                }
                label={texts.PAY_WITH_CREDIT}
              />
            </RadioGroup>
            {method === "credit" &&
              charging.saleMoney !== null &&
              charging.storeCredit !== null &&
              (() => {
                // Work the split in the SAME pesos the total is shown in, so
                // the parts add back to the total exactly. Store credit first,
                // then sale money, then cash for the rest.
                const totalP =
                  charging.order.totalpesos != null
                    ? Number(charging.order.totalpesos)
                    : rate != null
                    ? Math.round(Number(charging.order.total) * rate)
                    : Number(charging.order.total);
                const toP = (usd) =>
                  rate != null ? Math.round(Number(usd) * rate) : Number(usd);
                const fmt = (v) => (rate != null ? formatPesos(v) : money(v));
                const storeUsed = Math.min(toP(charging.storeCredit), totalP);
                const saleUsed = Math.min(
                  toP(charging.saleMoney),
                  totalP - storeUsed
                );
                const cashP = totalP - storeUsed - saleUsed;
                return (
                  <Box>
                    {storeUsed > 0 && (
                      <Typography variant="body2">
                        {texts.STORE_CREDIT_SHORT} {fmt(storeUsed)}
                      </Typography>
                    )}
                    {saleUsed > 0 && (
                      <Typography variant="body2">
                        {texts.SALE_MONEY_SHORT} {fmt(saleUsed)}
                      </Typography>
                    )}
                    {cashP > 0 && (
                      <Typography variant="body2">
                        {texts.CASH_DUE} {fmt(cashP)}
                      </Typography>
                    )}
                  </Box>
                );
              })()}
            <Button
              onClick={() =>
                act(charging.order, "complete", null, {
                  paywithcredit: method === "credit",
                })
              }
            >
              {texts.COMPLETE_ORDER}
            </Button>
          </Stack>
        )}
      </SideForm>
    </div>
  );
}
