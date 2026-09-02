import React, { useState, useEffect } from "react";
import { toast } from "../utils/toast";
import Header from "../header/Header";
import Title from "../elementos/Title";
import SideForm from "../elementos/SideForm";
import FixedPriceSidebar from "./FixedPriceSidebar";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import { isFoil, finishLabel } from "../utils/finishes";
import "./pricing.css";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// The shop's pricing policy and the per-card overrides, on one page: both
// answer "what does this card cost". Two halves under one divider — the
// exchange rate that derives every peso price, and the prices somebody has
// pinned by hand, which the nightly import must not touch.
export default function Pricing() {
  const [loader, setLoader] = useState(true);
  // Every stock row whose price is fixed by hand.
  const [fixed, setFixed] = useState([]);
  // Whether the fix-a-price sidebar is slid out.
  const [adding, setAdding] = useState(false);
  // The pesos-per-dollar rate, as typed. Empty string while none is set.
  const [rate, setRate] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  const navigate = useNavigate();

  function loadFixed() {
    accessAPI(
      "GET",
      "admin/prices/fixed",
      null,
      (response) => setFixed(response ?? []),
      (response) => toast(response.message)
    );
  }

  useEffect(() => {
    // Owner gate doubling as the page loader: staff get a 403 here and are
    // sent back to login. The response itself is unused since the multiplier
    // table left the page — every card now prices as NM.
    accessAPI(
      "GET",
      "admin/condition",
      null,
      () => setLoader(false),
      (response) => {
        toast(response.message);
        logout();
        navigate("/login");
      }
    );
    loadFixed();
    accessAPI(
      "GET",
      "store/exchangerate",
      null,
      (response) => setRate(response.rate ?? ""),
      () => setRate("")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveRate() {
    setSavingRate(true);
    accessAPI(
      "PUT",
      "admin/exchangerate",
      { rate: Number(rate) },
      (response) => {
        setSavingRate(false);
        setRate(response.rate ?? "");
        toast(texts.EXCHANGE_SAVED, "success");
      },
      (response) => {
        setSavingRate(false);
        toast(response.message);
      }
    );
  }

  // Rejoining the market. A version pin is deleted outright; a legacy
  // row-level lock (from before pins existed) is unlocked in place. Either
  // way the API puts the CardKingdom reference back immediately and the row
  // leaves this table.
  function resetToReference(row) {
    const done = () => {
      toast(texts.RESET_DONE, "success");
      loadFixed();
    };
    const fail = (response) => toast(response.message);
    if (row.kind === "version") {
      accessAPI(
        "DELETE",
        `admin/prices/fixed/${row.scryfallid}`,
        null,
        done,
        fail
      );
    } else {
      accessAPI(
        "PUT",
        `admin/card/${row.id}/price`,
        { pricelocked: false, buypricelocked: false },
        done,
        fail
      );
    }
  }

  // The exact card the number is stuck to. A version pin identifies a
  // printing (art, set, collector number) and says whether stock currently
  // carries it; a legacy row-level lock also names the grade, because two
  // rows of the same printing in different condition were priced apart.
  function cardCell(row) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {row.image && (
          <Box
            component="img"
            src={row.image}
            alt={row.name}
            loading="lazy"
            sx={{ width: 32, height: 45, borderRadius: 0.5 }}
          />
        )}
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {[
              row.cardsetname,
              row.collectornumber && `#${row.collectornumber}`,
              isFoil(row.variant) ? finishLabel(row.variant) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Typography>
          {row.kind === "version" && row.instock === 0 && (
            <Typography
              variant="caption"
              color="warning.main"
              sx={{ display: "block" }}
            >
              {texts.FIXED_NO_STOCK_YET}
            </Typography>
          )}
          {/* A soft pin yields to CardKingdom once it has a price. */}
          {row.revert && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {texts.REVERT_TO_CK}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      {loader && <Loader color="blue" />}
      {!loader && (
        <div className="content">
          <Title title={texts.EXCHANGE_TITLE} subtitle={texts.EXCHANGE_HINT} />

          {/* Changing the rate changes what is SHOWN and what future bags
              freeze; peso amounts already frozen on order lines keep the
              rate of their day. */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <TextField
              type="number"
              size="small"
              label={texts.EXCHANGE_RATE_LABEL}
              inputProps={{ step: 0.01, min: 0 }}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              sx={{ width: 160 }}
            />
            <Button
              onClick={saveRate}
              disabled={savingRate || !(Number(rate) > 0)}
            >
              {texts.SAVE_EXCHANGE}
            </Button>
          </Box>
          {rate === "" && (
            <Typography variant="caption" color="text.secondary">
              {texts.EXCHANGE_NOT_SET}
            </Typography>
          )}

          {/* The per-condition multiplier table lived here until 2026-08-23,
              when the shop stopped tracking condition in the UI: every card
              now prices as NM, so a grid of multipliers that no longer apply
              would only mislead. The endpoint and columns survive for the day
              condition comes back. */}
          <Divider sx={{ my: 4 }} />

          <Title
            title={texts.FIXED_TITLE}
            subtitle={texts.PRICE_SEARCH_HINT}
            buttons={[
              { label: texts.ADD_FIXED_PRICE, onClick: () => setAdding(true) },
            ]}
          />

          {!fixed.length && (
            <Typography color="text.secondary">
              {texts.NO_FIXED_PRICES}
            </Typography>
          )}
          {fixed.length > 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell align="right" sx={{ width: 110 }}>
                      {texts.COL_SELL}
                    </TableCell>
                    <TableCell align="right" sx={{ width: 110 }}>
                      {texts.COL_BUY}
                    </TableCell>
                    <TableCell align="right" sx={{ width: 140 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fixed.map((card) => (
                    <TableRow
                      key={card.kind === "version" ? card.scryfallid : `row-${card.id}`}
                      hover
                    >
                      <TableCell>{cardCell(card)}</TableCell>
                      {/* Only the locked side shows a number: the other one
                          still follows the market and its current value would
                          read as fixed here. */}
                      <TableCell align="right">
                        {card.pricelocked ? `U$S ${card.price}` : "—"}
                      </TableCell>
                      <TableCell align="right">
                        {card.buypricelocked ? `U$S ${card.buyprice}` : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => resetToReference(card)}
                        >
                          {texts.RESET_TO_CK}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      )}

      {/* Fixing prices is a run of them (a whole display case at once), so the
          sidebar stays open across saves; the table behind refreshes on each. */}
      <SideForm
        open={adding}
        onClose={() => setAdding(false)}
        title={texts.ADD_FIXED_PRICE}
      >
        <FixedPriceSidebar onFixed={loadFixed} />
      </SideForm>
    </div>
  );
}
