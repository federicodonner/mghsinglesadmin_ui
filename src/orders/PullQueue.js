import React, { useState, useEffect } from "react";
import { toast } from "../utils/toast";
import texts from "../data/texts";
import { accessAPI } from "../utils/fetchFunctions";
import { locationLabel } from "../utils/locationLabel";
import "./orders.css";
import Button from "@mui/material/Button";

// Cards already reserved into a customer's bag that nobody has physically
// taken out of their container yet. A storefront buy holds the copy the
// second it happens, but the card is still sitting in its pocket — until
// somebody walks over, the bag on the counter and the shelf disagree.
//
// Per-row "Listo" rather than one button for the lot: bags are assembled a
// card at a time between customers, and marking all of them on the first trip
// would lie about the ones still shelved.
export default function PullQueue() {
  const [rows, setRows] = useState([]);

  function load() {
    accessAPI(
      "GET",
      "admin/pulls",
      null,
      (response) => setRows(response ?? []),
      () => setRows([])
    );
  }

  useEffect(() => {
    load();
  }, []);

  function done(row) {
    accessAPI(
      "POST",
      "admin/pulls/done",
      { placementids: [row.placementid] },
      () => setRows((current) => current.filter((r) => r !== row)),
      (response) => toast(response.message)
    );
  }

  if (!rows.length) return null;

  return (
    <div className="pullPanel">
      <div className="refileTitle">{texts.PULL_TITLE}</div>
      <div className="demandHint">{texts.PULL_HINT}</div>
      {rows.map((row) => (
        <div className="refileRow" key={row.placementid}>
          <span className="lineName">{row.name}</span>
          <span className="lineSet">{(row.cardsetcode ?? "").toUpperCase()}</span>
          <span className="lineMeta">
            {row.customer ?? texts.SELL_TITLE}
          </span>
          <span className="refileWhere">{locationLabel(row)}</span>
          <Button size="small" onClick={() => done(row)}>
            {texts.PULL_DONE}
          </Button>
        </div>
      ))}
    </div>
  );
}
