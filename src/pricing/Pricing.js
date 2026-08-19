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
// multipliers that derive every price from the CardKingdom reference, and the
// prices somebody has pinned by hand, which the nightly import must not touch.
export default function Pricing() {
  const [loader, setLoader] = useState(true);
  const [conditions, setConditions] = useState([]);
  const [savingMultipliers, setSavingMultipliers] = useState(false);
  // Every stock row whose price is fixed by hand.
  const [fixed, setFixed] = useState([]);
  // Whether the fix-a-price sidebar is slid out.
  const [adding, setAdding] = useState(false);

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
    accessAPI(
      "GET",
      "admin/condition",
      null,
      (response) => {
        setConditions(response);
        setLoader(false);
      },
      (response) => {
        toast(response.message);
        logout();
        navigate("/login");
      }
    );
    loadFixed();
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
        toast(texts.PRICES_UPDATED, "success");
      },
      (response) => {
        setSavingMultipliers(false);
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
              row.condition,
              row.language,
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
          <Title title={texts.MULTIPLIERS_TITLE} subtitle={texts.MULTIPLIERS_HINT} />

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
          <Button onClick={saveMultipliers} disabled={savingMultipliers}>
            {texts.SAVE_MULTIPLIERS}
          </Button>

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
