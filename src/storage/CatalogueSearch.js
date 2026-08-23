import React, { useState } from "react";
import Stack from "@mui/material/Stack";
import texts from "../data/texts";
import CardNameAutocomplete from "../elementos/CardNameAutocomplete";

// Finding a card to add to the shop's own stock.
//
// This searches the CATALOGUE, not the stock — the point of adding is cards
// the store does not hold yet, which is the opposite of the till's search in
// sell/Sell.js. The field suggests real card names as you type; picking one is
// the whole job: fetching the printings of the picked name lives with the
// caller, which also pages and filters them.
export default function CatalogueSearch({ onPick }) {
  const [chosen, setChosen] = useState(null);

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ my: 2 }}
      flexWrap="wrap"
      useFlexGap
    >
      <CardNameAutocomplete
        fullWidth
        value={chosen}
        onChange={(name) => {
          setChosen(name);
          onPick(name);
        }}
        label={texts.CARD_NAME}
      />
    </Stack>
  );
}
