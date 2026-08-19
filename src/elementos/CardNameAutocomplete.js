import React, { useState, useEffect, useMemo } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import texts from "../data/texts";
import { accessAPI } from "../utils/fetchFunctions";

// A card-name field that suggests real cards, in two flavours:
//
// * `stockOnly` + `freeSolo` (the till): suggestions come from STOCK
//   (`stock=1`) — the till can only ring up cards the store holds, and fifteen
//   catalogue names with no copies behind them would bury the one that
//   matters. FreeSolo because staff searching "bolt" across every Bolt is a
//   feature at the counter: typed text searches as-is via `onSearch`, and a
//   picked suggestion searches immediately.
//
// * controlled `value`/`onChange` (adding stock): suggestions come from the
//   whole catalogue, because the point of adding is cards the store does NOT
//   hold yet. Not freeSolo — the name feeds the version picker, so a typo
//   would show zero printings and look broken.
export default function CardNameAutocomplete({
  value,
  onChange,
  onSearch,
  onInputChange,
  disabled,
  label,
  placeholder,
  stockOnly = false,
  freeSolo = false,
  autoFocus = false,
}) {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounced so a fast typist does not fire a request per keystroke; 250ms is
  // below the threshold where the list feels laggy but well above per-letter.
  const query = useMemo(() => input.trim(), [input]);

  useEffect(() => {
    if (query.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      accessAPI(
        "GET",
        `card/names?q=${encodeURIComponent(query)}${stockOnly ? "&stock=1" : ""}`,
        null,
        (response) => {
          // A slow response for an earlier query must not overwrite the list
          // for the one the user is actually looking at.
          if (cancelled) return;
          setOptions(response ?? []);
          setLoading(false);
        },
        () => {
          if (cancelled) return;
          setOptions([]);
          setLoading(false);
        }
      );
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, stockOnly]);

  return (
    <Autocomplete
      freeSolo={freeSolo}
      value={value}
      onChange={(e, picked) => {
        // In freeSolo mode this fires for a clicked suggestion and for Enter
        // alike; either way this is the name the person wants, so search now.
        const name = typeof picked === "string" ? picked.trim() : picked;
        if (onSearch && name) onSearch(name);
        onChange?.(name);
      }}
      inputValue={input}
      onInputChange={(e, next) => {
        setInput(next);
        onInputChange?.(next);
      }}
      options={options}
      loading={loading}
      disabled={disabled}
      // The API already ranks these (prefix matches first); re-filtering here
      // would drop suggestions whose match is not a plain substring.
      filterOptions={(x) => x}
      noOptionsText={
        query.length < 2 ? texts.AUTOCOMPLETE_HINT : texts.AUTOCOMPLETE_NONE
      }
      sx={{ flex: "1 1 320px", maxWidth: 420 }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          autoFocus={autoFocus}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={16} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
