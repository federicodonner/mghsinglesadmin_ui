import React, { useState, useEffect } from "react";
import { toast } from "../utils/toast";
import Header from "../header/Header";
import Title from "../elementos/Title";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import "./payment.css";
import { accessAPI, logout } from "../utils/fetchFunctions";
import { useExchangeRate, formatPesos } from "../utils/exchange";
import texts from "../data/texts";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

const money = (value) => `U$S ${Number(value).toFixed(2)}`;

function formatDate(seconds) {
  const date = new Date(seconds * 1000);
  return (
    String(date.getDate()).padStart(2, "0") +
    "/" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "/" +
    date.getFullYear()
  );
}

// What the store owes, card by card, grouped by consignor.
//
// Paying is selecting the cards being settled and confirming — the amount is
// the sum of their remaining nets, never a number typed by hand, so the
// ledger can only ever say what actually happened. A "parcial" chip marks a
// sale partly consumed as store credit: only its remainder is owed.
export default function Payment() {
  const [loader, setLoader] = useState(true);
  const [groups, setGroups] = useState([]);
  // Consignors are paid in pesos, so this page shows pesos, converted at
  // today's rate (payouts are stored in dollars — a display convenience, not a
  // re-statement of the debt). Dollars only as a fallback with no rate.
  const rate = useExchangeRate();
  // Selected sale ids, across all groups.
  const [selected, setSelected] = useState(() => new Set());
  const [paying, setPaying] = useState(false);
  // Which groups are open. Everyone starts collapsed: the page's first answer
  // is "who do I owe and how much", and the card-by-card detail is on demand.
  const [expanded, setExpanded] = useState(() => new Set());

  const navigate = useNavigate();

  function load() {
    accessAPI(
      "GET",
      "admin/payment/owed",
      null,
      (response) => {
        setGroups(response ?? []);
        setSelected(new Set());
        setLoader(false);
      },
      (response) => {
        toast(response.message);
        logout();
        navigate("/login");
      }
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleExpanded(collectionid) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(collectionid)) next.delete(collectionid);
      else next.add(collectionid);
      return next;
    });
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(group) {
    const ids = group.sales.map((sale) => sale.id);
    const allIn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  // The amount about to change hands in one group: the sum of the selected
  // rows' remainders (in dollars — used only for the >0 enabled check).
  function selectedTotal(group) {
    return group.sales
      .filter((sale) => selected.has(sale.id))
      .reduce((sum, sale) => sum + Number(sale.remaining), 0);
  }

  // Show one independent dollar amount in pesos (a payment in the history, the
  // toast). formatPesos(round(x·rate)) — the same per-value rounding sumOwed
  // uses, so a total built from rows and a single row never disagree.
  const showMoney = (usd) =>
    rate != null ? formatPesos(Math.round(Number(usd) * rate)) : money(usd);

  // A total built from the SAME rounded pesos the rows show, so the group
  // header and the "pay selected" button always add up to the visible rows.
  const sumOwed = (sales) =>
    rate != null
      ? formatPesos(
          sales.reduce((s, x) => s + Math.round(Number(x.remaining) * rate), 0)
        )
      : money(sales.reduce((s, x) => s + Number(x.remaining), 0));

  function pay(group) {
    const ids = group.sales
      .map((sale) => sale.id)
      .filter((id) => selected.has(id));
    if (!ids.length) return;
    setPaying(true);
    accessAPI(
      "POST",
      "admin/payment",
      { saleids: ids },
      (response) => {
        setPaying(false);
        toast(`${texts.PAYMENT_PROCESSED} (${showMoney(response.paid)})`, "success");
        load();
      },
      (response) => {
        setPaying(false);
        toast(response.message);
      }
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      <div className="content">
        {loader && <Loader />}
        {!loader && (
          <>
            <Title title={texts.PAYMENT_TITLE} subtitle={texts.PAYMENT_HINT} />

            {!groups.length && (
              <Typography color="text.secondary">
                {texts.NOTHING_OWED}
              </Typography>
            )}

            {groups.map((group) => {
              const ids = group.sales.map((sale) => sale.id);
              const allIn = ids.every((id) => selected.has(id));
              const someIn = ids.some((id) => selected.has(id));
              const total = selectedTotal(group);
              const open = expanded.has(group.collectionid);
              return (
                <Box key={group.collectionid} sx={{ mb: 2 }}>
                  {/* The whole header toggles the group open; the controls on
                      it (checkbox, pay) stop the click so ticking cards does
                      not slam the drawer shut. */}
                  <Box
                    onClick={() => toggleExpanded(group.collectionid)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      mb: 0.5,
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "action.hover" },
                      borderRadius: 1,
                    }}
                  >
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{
                        transform: open ? "none" : "rotate(-90deg)",
                        transition: "transform 150ms",
                        color: "text.secondary",
                      }}
                    />
                    {/* A settled account has nothing to select or pay — it is
                        here for its history. */}
                    {group.sales.length > 0 && (
                      <Checkbox
                        size="small"
                        checked={allIn}
                        indeterminate={someIn && !allIn}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleGroup(group)}
                      />
                    )}
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {group.name}
                    </Typography>
                    {group.sales.length > 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {texts.OWES} {sumOwed(group.sales)}
                      </Typography>
                    ) : (
                      <Chip size="small" color="success" variant="outlined"
                        label={texts.SETTLED}
                      />
                    )}
                    {group.sales.length > 0 && (
                      <Button
                        size="small"
                        sx={{ ml: "auto" }}
                        disabled={paying || total <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          pay(group);
                        }}
                      >
                        {texts.PAY_SELECTED} (
                        {sumOwed(
                          group.sales.filter((sale) => selected.has(sale.id))
                        )}
                        )
                      </Button>
                    )}
                  </Box>
                  <Collapse in={open} timeout="auto" unmountOnExit>
                  {group.sales.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {group.sales.map((sale) => (
                          <TableRow
                            key={sale.id}
                            hover
                            onClick={() => toggle(sale.id)}
                            sx={{ cursor: "pointer" }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={selected.has(sale.id)}
                              />
                            </TableCell>
                            <TableCell sx={{ width: 100 }}>
                              {formatDate(sale.date)}
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                }}
                              >
                                {/* No card image here (2026-09-02, Federico):
                                    the pending-payments list reads as a
                                    statement, not a gallery. */}
                                <Box>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {sale.quantity > 1 && `${sale.quantity}× `}
                                    {sale.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {sale.cardsetname}
                                  </Typography>
                                </Box>
                                {/* No "parcial" flag (2026-09-03): the shop
                                    does not track payment card by card — a row
                                    just shows the amount still owed on it. */}
                              </Box>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ width: 130, fontWeight: 600 }}
                            >
                              {showMoney(sale.remaining)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  )}

                  {/* Payment history moved to each user's "Ver historial"
                      (Usuarios) — 2026-09-02. This page is now just what is
                      owed and the paying of it. */}
                  </Collapse>
                </Box>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
