import React, { useState, useEffect } from "react";
import { toast } from "../utils/toast";
import texts from "../data/texts";
import { accessAPI } from "../utils/fetchFunctions";
import { locationLabel } from "../utils/locationLabel";
import "./orders.css";
import Button from "@mui/material/Button";

// Cards out of cancelled or expired bags, physically waiting on the counter to
// be put back where their coordinates say. Persistent — the flag lives on the
// placement, so this survives reloads and shifts — and on the home page,
// because until these are back in their pockets the containers on the shelf
// are lying about what is in them.
export default function RefileQueue() {
  const [rows, setRows] = useState([]);

  function load() {
    accessAPI(
      "GET",
      "admin/refile",
      null,
      (response) => setRows(response ?? []),
      () => setRows([])
    );
  }

  useEffect(() => {
    load();
  }, []);

  function done() {
    accessAPI(
      "POST",
      "admin/refile/done",
      { placementids: rows.map((row) => row.placementid) },
      (response) => {
        toast(response.message, "success");
        load();
      },
      (response) => toast(response.message)
    );
  }

  if (!rows.length) return null;

  return (
    <div className="refilePanel">
      <div className="refileTitle">{texts.REFILE_TITLE}</div>
      <div className="demandHint">{texts.REFILE_HINT}</div>
      {rows.map((row) => (
        <div className="refileRow" key={row.placementid}>
          <span className="lineName">{row.name}</span>
          <span className="lineSet">{(row.cardsetcode ?? "").toUpperCase()}</span>
          <span className="refileWhere">{locationLabel(row)}</span>
        </div>
      ))}
      <Button size="small" onClick={done}>
        {texts.REFILE_DONE}
      </Button>
    </div>
  );
}
