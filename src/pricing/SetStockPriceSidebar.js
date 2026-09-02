import React, { useState } from "react";
import { toast } from "../utils/toast";
import { accessAPI } from "../utils/fetchFunctions";
import texts from "../data/texts";
import { isFoil, finishLabel } from "../utils/finishes";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// Price ONE in-stock card that has no price yet, from the home page's "sin
// precio" list. Deliberately narrower than the Precios page's pinning tool:
//
//   * only the exact version that is in the shop — no catalogue search, no
//     version browser (this card is already the one sitting on the shelf);
//   * only the SELL price — the buy price is not a storefront concern here;
//   * a flag for what happens when CardKingdom eventually lists the card.
//
// The flag maps to `pricelocked` on the card. Checked ("volver a CK") leaves
// the card UNLOCKED, so the nightly price sync replaces this manual number the
// day a CardKingdom reference appears. Unchecked LOCKS it, and the manual price
// stands until a human changes it.
export default function SetStockPriceSidebar({ card, onDone }) {
  const [price, setPrice] = useState("");
  const [revert, setRevert] = useState(false);
  const [saving, setSaving] = useState(false);

  const value = price.trim();
  const valid = value !== "" && Number(value) >= 0;

  function save() {
    if (!valid) return;
    setSaving(true);
    accessAPI(
      "PUT",
      `admin/card/${card.cardid}/price`,
      // Sell only; no buyprice. `pricelocked: !revert` is the whole flag.
      { price: Number(value), pricelocked: !revert },
      () => {
        setSaving(false);
        toast(texts.PRICE_SET, "success");
        onDone();
      },
      (response) => {
        setSaving(false);
        toast(response.message);
      }
    );
  }

  return (
    <Stack spacing={2}>
      {/* The one card being priced — no picker, this is it. */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        {card.image && (
          <Box
            component="img"
            src={card.image}
            alt={card.name}
            sx={{ width: 56, borderRadius: 1, flex: "0 0 auto" }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1">{card.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {card.cardsetname}
            {card.cardsetcode && ` (${card.cardsetcode.toUpperCase()})`}
          </Typography>
          {isFoil(card.variant) && (
            <Box sx={{ mt: 0.5 }}>
              <Chip size="small" color="secondary" label={finishLabel(card.variant)} />
            </Box>
          )}
        </Box>
      </Stack>

      <TextField
        type="number"
        label={texts.COL_SELL}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        inputProps={{ step: 0.01, min: 0 }}
        autoFocus
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={revert}
            onChange={(e) => setRevert(e.target.checked)}
          />
        }
        label={texts.REVERT_TO_CK}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
        {revert ? texts.REVERT_ON_HINT : texts.REVERT_OFF_HINT}
      </Typography>

      <Button variant="contained" disabled={saving || !valid} onClick={save}>
        {texts.SET_PRICE}
      </Button>
    </Stack>
  );
}
