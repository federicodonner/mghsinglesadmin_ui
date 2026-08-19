import React, { useState, useEffect, useRef } from "react";
import { toast } from "../utils/toast";
import { confirmDialog } from "../utils/confirm";
import { useNavigate } from "react-router-dom";
import Header from "../header/Header";
import Title from "../elementos/Title";
import CardNameAutocomplete from "../elementos/CardNameAutocomplete";
import Loader from "../loader/Loader";
import "./sell.css";
import "../orders/orders.css";
import { accessAPI, logout } from "../utils/fetchFunctions";
import { isFoil, finishLabel } from "../utils/finishes";
import { locationLabel } from "../utils/locationLabel";
import texts from "../data/texts";
import Button from "@mui/material/Button";

// A sale over the counter, on the same rails as a reservation.
//
// Searching hits the LIVE store stock — the same availability the storefront
// shows, so a copy in somebody's pick-up bag cannot be rung up twice. Adding a
// card moves a physical copy into a bag: a pending order with no customer
// behind it, because the person at the till may not have an account. Cobrar
// writes the sale rows that credit each card's owner; cancelling flags every
// copy for the refile panel on the home page.
export default function Sell() {
  const [loader, setLoader] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  // The open counter bag — the sale in progress. Server state, not component
  // state: reloading the page finds the bag exactly as it was.
  const [bag, setBag] = useState(null);

  let navigate = useNavigate();
  // What is typed in the search field right now, for the Buscar button; the
  // autocomplete searches directly when a suggestion is picked.
  const nameRef = useRef("");

  useEffect(() => {
    accessAPI(
      "GET",
      "admin/me",
      null,
      () => setLoggedIn(true),
      () => {
        logout();
        navigate("/");
      }
    );
    accessAPI(
      "GET",
      "admin/countersale",
      null,
      (response) => {
        setBag(response);
        setLoader(false);
      },
      (response) => {
        toast(response.message);
        setLoader(false);
      }
    );
  }, [navigate]);

  function search(name) {
    if (!name) return;
    setSearching(true);
    accessAPI(
      "GET",
      `admin/countersale/search?name=${encodeURIComponent(name)}`,
      null,
      (response) => {
        setResults(response.cards ?? []);
        setSearching(false);
      },
      (response) => {
        toast(response.message);
        setResults(null);
        setSearching(false);
      }
    );
  }

  function findCard(e) {
    e.preventDefault();
    search(nameRef.current.trim());
  }

  // Ring up the copy the person actually pulled off the shelf. The placement
  // id pins that exact copy, so its pocket stops offering it and a later
  // cancellation refiles it to the right place.
  function addCard(card, copy) {
    accessAPI(
      "POST",
      "admin/countersale/add",
      copy ? { cardid: card.id, placementid: copy.placementid } : { cardid: card.id },
      (response) => {
        setBag(response);
        // The copy is in the bag now; the on-screen list follows.
        setResults(
          (rows) =>
            rows?.map((row) =>
              row.id === card.id
                ? {
                    ...row,
                    available: row.available - 1,
                    copies: copy
                      ? row.copies.filter(
                          (c) => c.placementid !== copy.placementid
                        )
                      : row.copies,
                  }
                : row
            ) ?? null
        );
      },
      (response) => toast(response.message)
    );
  }

  async function complete() {
    if (!(await confirmDialog(texts.CONFIRM_COMPLETE))) return;
    accessAPI(
      "POST",
      `admin/order/${bag.id}/complete`,
      null,
      (response) => {
        toast(response.message, "success");
        setBag(null);
        setResults(null);
      },
      (response) => toast(response.message)
    );
  }

  async function cancel() {
    if (!(await confirmDialog(texts.CONFIRM_CANCEL_SALE))) return;
    accessAPI(
      "POST",
      `admin/order/${bag.id}/cancel`,
      null,
      (response) => {
        toast(response.message);
        setBag(null);
        // Availability on screen is stale after a cancel; a fresh search says
        // the truth.
        setResults(null);
      },
      (response) => toast(response.message)
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={loggedIn} />
      <div className="content">
        {loader && <Loader />}
        {!loader && (
          <>
            <Title title={texts.SELL_TITLE} subtitle={texts.SELL_HINT} />

            <form className="sellSearch" onSubmit={findCard}>
              <CardNameAutocomplete
                freeSolo
                stockOnly
                autoFocus
                placeholder={texts.CARD_NAME}
                onSearch={search}
                onInputChange={(next) => {
                  nameRef.current = next;
                }}
                disabled={searching}
              />
              <Button type="submit" disabled={searching}>
                {texts.SEARCH}
              </Button>
            </form>

            {results && !results.length && (
              <div className="emptyState">{texts.SELL_NO_RESULTS}</div>
            )}
            {results?.map((card) => (
              <div className="sellResult" key={card.id}>
                {/* The version, seen: at the counter the card is in somebody's
                    hand, and matching art beats reading a set code. */}
                {card.image && (
                  <img
                    className="sellResultArt"
                    src={card.image}
                    alt={card.name}
                    loading="lazy"
                  />
                )}
                <div className="sellResultBody">
                  <div className="orderLine sellResultHead">
                    <span className="lineName">{card.name}</span>
                    <span className="lineSet">
                      {(card.cardsetcode ?? "").toUpperCase()}
                    </span>
                    <span className="lineMeta">{card.condition}</span>
                    <span className="lineMeta">{card.language}</span>
                    {isFoil(card.variant) && (
                      <span className="lineMeta">
                        {finishLabel(card.variant)}
                      </span>
                    )}
                    {card.owner && (
                      <span className="lineMeta">{card.owner}</span>
                    )}
                    <span className="linePrice">U$S {card.price ?? "?"}</span>
                  </div>
                  {/* One row per physical copy: where it sits, so the person
                      rings up exactly the one they pulled. */}
                  {card.copies.map((copy) => (
                    <div className="orderLine sellCopy" key={copy.placementid}>
                      <span className="lineMeta">{locationLabel(copy)}</span>
                      <Button size="small"
                        disabled={card.available < 1}
                        onClick={() => addCard(card, copy)}
                      >
                        {texts.ADD}
                      </Button>
                    </div>
                  ))}
                  {/* Stock the shop holds but never filed has no pocket to
                      name; it can still be sold. */}
                  {!card.copies.length && card.available > 0 && (
                    <div className="orderLine sellCopy">
                      <span className="lineMeta">{texts.SELL_NO_LOCATION}</span>
                      <Button size="small" onClick={() => addCard(card, null)}>
                        {texts.ADD}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="cardsInSale">
              <Title title={texts.CARDS_IN_SALE} />
              {!bag && <div className="emptyState">{texts.SELL_EMPTY}</div>}
              {bag && (
                <>
                  {bag.lines.map((line) => (
                    <div className="orderLine" key={line.id}>
                      <span className="lineQuantity">{line.quantity}</span>
                      <span className="lineName">{line.name}</span>
                      <span className="lineSet">
                        {(line.cardsetcode ?? "").toUpperCase()}
                      </span>
                      <span className="lineMeta">{line.condition}</span>
                      <span className="lineMeta">{line.language}</span>
                      {isFoil(line.variant) && (
                        <span className="lineMeta">
                          {finishLabel(line.variant)}
                        </span>
                      )}
                      <span className="linePrice">U$S {line.price}</span>
                    </div>
                  ))}
                  <div className="sellTotal">
                    {texts.ORDER_TOTAL} U$S {bag.total}
                  </div>
                  <div className="orderActions">
                    <Button onClick={complete}>{texts.COMPLETE_ORDER}</Button>
                    <Button variant="outlined" color="error" onClick={cancel}>
                      {texts.CANCEL_SALE}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
