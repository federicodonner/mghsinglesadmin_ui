import React, { useState, useEffect } from "react";
import SideForm from "../elementos/SideForm";
import SetStockPriceSidebar from "./SetStockPriceSidebar";
import texts from "../data/texts";
import { accessAPI } from "../utils/fetchFunctions";
import { isFoil, finishLabel } from "../utils/finishes";
import "../orders/orders.css";
import "./unpriced.css";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";

// In-stock cards that have no price yet, on the home page so the shop prices
// them before they can be sold. A card with no price is hidden from shoppers
// (the storefront treats it as not on sale), so this list is the shop's cue to
// act. Commons and uncommons are not here — they get an automatic default from
// the pricing pipeline; everything listed is a rare/mythic/special with no
// CardKingdom reference. Pricing one opens the same "fijar precio" form as the
// Precios page, pre-seeded to the card.
export default function UnpricedQueue() {
  const [rows, setRows] = useState([]);
  // The card whose price is being set, or null. Keyed into the sidebar so a
  // different card re-seeds the form.
  const [pricing, setPricing] = useState(null);

  function load() {
    accessAPI(
      "GET",
      "admin/unpriced",
      null,
      (response) => setRows(response ?? []),
      () => setRows([])
    );
  }

  useEffect(() => {
    load();
  }, []);

  if (!rows.length) return null;

  return (
    <div className="refilePanel">
      <div className="refileTitle">{texts.UNPRICED_TITLE}</div>
      <div className="demandHint">{texts.UNPRICED_HINT}</div>
      {rows.map((row) => (
        <div className="unpricedRow" key={row.cardid}>
          {row.image && (
            <img
              className="unpricedThumb"
              src={row.image}
              alt={row.name}
              loading="lazy"
            />
          )}
          <span className="lineName">{row.name}</span>
          <span className="lineSet">
            {(row.cardsetcode ?? "").toUpperCase()}
          </span>
          {isFoil(row.variant) && (
            <Chip size="small" color="secondary" label={finishLabel(row.variant)} />
          )}
          <span className="unpricedStock">
            {row.instock} {texts.IN_STOCK}
          </span>
          <Button
            size="small"
            variant="contained"
            onClick={() => setPricing(row)}
          >
            {texts.SET_PRICE}
          </Button>
        </div>
      ))}

      <SideForm
        open={Boolean(pricing)}
        onClose={() => setPricing(null)}
        title={texts.SET_PRICE}
      >
        {pricing && (
          <SetStockPriceSidebar
            key={pricing.cardid}
            card={pricing}
            onDone={() => {
              // The card is priced now — drop it from the list and close.
              setPricing(null);
              load();
            }}
          />
        )}
      </SideForm>
    </div>
  );
}
