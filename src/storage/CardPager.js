import React from "react";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import texts from "../data/texts";

// The pager under a box's or an edition box's cards: the pages, and how many
// cards each one shows. Hidden while every card fits on a page of the
// smallest size, so there is nothing to choose.
export default function CardPager({
  total,
  page,
  pageCount,
  onPageChange,
  size,
  sizes,
  onSizeChange,
}) {
  if (total <= sizes[0]) return null;
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="center"
      flexWrap="wrap"
      useFlexGap
      sx={{ my: 1.5 }}
    >
      {pageCount > 1 && (
        <Pagination
          count={pageCount}
          page={page}
          onChange={(e, next) => onPageChange(next)}
        />
      )}
      <TextField
        select
        size="small"
        SelectProps={{ native: true }}
        label={texts.PER_PAGE}
        value={size}
        onChange={(e) => onSizeChange(parseInt(e.target.value, 10))}
        sx={{ width: 110 }}
      >
        {sizes.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </TextField>
    </Stack>
  );
}
