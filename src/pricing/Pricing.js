import React, { useState, useEffect, useRef } from "react";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import { isFoil, finishLabel } from "../utils/finishes";
import "./pricing.css";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tooltip from "@mui/material/Tooltip";

// The shop's pricing policy and the per-card overrides, on one page: both
// answer "what does this card cost", and the multipliers are meaningless
// without seeing what they produce.
export default function Pricing() {
  const [loader, setLoader] = useState(true);
  const [conditions, setConditions] = useState([]);
  const [savingMultipliers, setSavingMultipliers] = useState(false);
  const [cards, setCards] = useState(null);
  const [searching, setSearching] = useState(false);
  // Edits in progress, keyed by card id, so typing does not save on each key.
  const [edits, setEdits] = useState({});

  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    accessAPI(
      "GET",
      "admin/condition",
      null,
      (response) => {
        setConditions(response);
        setLoader(false);
      },
      (response) => {
        alert(response.message);
        logout();
        navigate("/login");
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setMultiplier(id, field, value) {
    setConditions((current) =>
      current.map((condition) =>
        condition.id === id ? { ...condition, [field]: value } : condition
      )
    );
  }

  function saveMultipliers() {
    setSavingMultipliers(true);
    accessAPI(
      "PUT",
      "admin/condition",
      { conditions },
      () => {
        setSavingMultipliers(false);
        // The change reprices stock server-side, so anything on screen is now
        // stale — re-run the search rather than showing yesterday's numbers.
        if (searchRef.current?.value) search();
        alert(texts.PRICES_UPDATED);
      },
      (response) => {
        setSavingMultipliers(false);
        alert(response.message);
      }
    );
  }

  function search(e) {
    if (e) e.preventDefault();
    const query = searchRef.current.value.trim();
    if (!query) return;
    setSearching(true);
    accessAPI(
      "GET",
      `store/search/${encodeURIComponent(query)}`,
      null,
      (response) => {
        setCards(response.cards ?? []);
        setEdits({});
        setSearching(false);
      },
      () => {
        setCards([]);
        setSearching(false);
      }
    );
  }

  function editOf(card) {
    return (
      edits[card.id] ?? {
        price: card.price ?? "",
        buyprice: card.buyprice ?? "",
        pricelocked: card.pricelocked,
        buypricelocked: card.buypricelocked,
      }
    );
  }

  function edit(card, field, value) {
    setEdits({ ...edits, [card.id]: { ...editOf(card), [field]: value } });
  }

  function savePrice(card) {
    const current = editOf(card);
    accessAPI(
      "PUT",
      `admin/card/${card.id}/price`,
      {
        // An empty box means "no price", which is different from zero.
        price: current.price === "" ? null : Number(current.price),
        buyprice: current.buyprice === "" ? null : Number(current.buyprice),
        pricelocked: current.pricelocked,
        buypricelocked: current.buypricelocked,
      },
      () => search(),
      (response) => alert(response.message)
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      {loader && <Loader color="blue" />}
      {!loader && (
        <div className="pricingContainer">
          <div className="title">{texts.MULTIPLIERS_TITLE}</div>
          <div className="pricingHint">{texts.MULTIPLIERS_HINT}</div>

          <div className="multiplierTable">
            <div className="multiplierRow head">
              <span className="multName" />
              <span>{texts.MULT_SELL}</span>
              <span>{texts.MULT_BUY}</span>
            </div>
            {conditions.map((condition) => (
              <div className="multiplierRow" key={condition.id}>
                <span className="multName">{condition.name}</span>
                <TextField
                  type="number"
                  size="small"
                  inputProps={{ step: 0.01, min: 0, max: 1, }}
                  value={condition.sellmultiplier}
                  onChange={(e) =>
                    setMultiplier(condition.id, "sellmultiplier", e.target.value)
                  }
                />
                <TextField
                  type="number"
                  size="small"
                  inputProps={{ step: 0.01, min: 0, max: 1, }}
                  value={condition.buymultiplier}
                  onChange={(e) =>
                    setMultiplier(condition.id, "buymultiplier", e.target.value)
                  }
                />
              </div>
            ))}
          </div>
          <Button
            onClick={saveMultipliers}
            disabled={savingMultipliers}
          >
            {texts.SAVE_MULTIPLIERS}
          </Button>

          <div className="title priceSearchTitle">
            {texts.PRICE_SEARCH_TITLE}
          </div>
          <div className="pricingHint">{texts.PRICE_SEARCH_HINT}</div>

          <form className="priceSearchForm" onSubmit={search}>
            <TextField
              type="text"
              placeholder={texts.PRICE_SEARCH_PLACEHOLDER}
              inputRef={searchRef}
            />
            <Button type="submit">
              {texts.FIND}
            </Button>
          </form>

          {searching && <Loader color="blue" />}

          {!searching && cards && cards.length > 0 && (
            <div className="priceTable">
              <div className="priceRow head">
                <span className="priceCard" />
                <span>{texts.COL_SELL}</span>
                <span>{texts.COL_BUY}</span>
                <span>{texts.COL_REFERENCE}</span>
                <span />
              </div>
              {cards.map((card) => {
                const current = editOf(card);
                return (
                  <div className="priceRow" key={card.id}>
                    <span className="priceCard">
                      <strong>{card.cardname}</strong>{" "}
                      <span className="priceMeta">
                        {(card.cardsetcode ?? "").toUpperCase()} ·{" "}
                        {card.condition} · {card.language}
                        {isFoil(card.variant) && ` · ${finishLabel(card.variant)}`}
                      </span>
                    </span>

                    {/* Sell and buy are edited and locked independently. */}
                    <span className="priceField">
                      <TextField
                        type="number"
                        size="small"
                        inputProps={{ step: 0.01, min: 0 }}
                        value={current.price}
                        onChange={(e) => edit(card, "price", e.target.value)}
                      />
                      <Tooltip
                        title={
                          current.pricelocked
                            ? texts.LOCKED
                            : texts.FOLLOWS_MARKET
                        }
                      >
                        <FormControlLabel
                          className="lockToggle"
                          control={
                            <Checkbox
                              size="small"
                              checked={current.pricelocked}
                              onChange={(e) =>
                                edit(card, "pricelocked", e.target.checked)
                              }
                            />
                          }
                          label={texts.LOCKED}
                        />
                      </Tooltip>
                    </span>

                    <span className="priceField">
                      <TextField
                        type="number"
                        size="small"
                        inputProps={{ step: 0.01, min: 0 }}
                        value={current.buyprice}
                        onChange={(e) => edit(card, "buyprice", e.target.value)}
                      />
                      <Tooltip
                        title={
                          current.buypricelocked
                            ? texts.LOCKED
                            : texts.FOLLOWS_MARKET
                        }
                      >
                        <FormControlLabel
                          className="lockToggle"
                          control={
                            <Checkbox
                              size="small"
                              checked={current.buypricelocked}
                              onChange={(e) =>
                                edit(card, "buypricelocked", e.target.checked)
                              }
                            />
                          }
                          label={texts.LOCKED}
                        />
                      </Tooltip>
                    </span>

                    {/* The NM figures the prices above were derived from. */}
                    <span className="priceReference">
                      {card.ckretail !== null && card.ckretail !== undefined ? (
                        <>
                          {card.ckretail}
                          {card.ckbuylist !== null &&
                            card.ckbuylist !== undefined &&
                            ` / ${card.ckbuylist}`}
                        </>
                      ) : (
                        <span className="priceMissing">
                          {texts.PRICE_NO_REFERENCE}
                        </span>
                      )}
                    </span>

                    <Button variant="outlined" size="small"
                      onClick={() => savePrice(card)}
                    >
                      {texts.SAVE_PRICE}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {!searching && cards && !cards.length && (
            <div className="emptyState">{texts.NO_RESULTS}</div>
          )}
        </div>
      )}
    </div>
  );
}
