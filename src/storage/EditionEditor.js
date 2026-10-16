import React, { useState, useEffect, useCallback, useRef } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import TuneIcon from "@mui/icons-material/Tune";
import RemoveIcon from "@mui/icons-material/Remove";
import texts from "../data/texts";
import { toast } from "../utils/toast";
import { accessAPI } from "../utils/fetchFunctions";
import PreviewCarta from "../elementos/PreviewCarta";
import { isFoil, finishLabel } from "../utils/finishes";
import { DEFAULT_CONDITION, DEFAULT_LANGUAGE, gradeLabel } from "../utils/grade";
import "./binder.css";

// A set runs to several hundred printings and each finish is its own line, so
// the whole checklist is well past what one screen — or one comfortable DOM —
// should hold. Fifty rows is a screenful of scrolling and no more.
const PAGE_SIZE = 50;

// How long to wait after the last keystroke before saving a typed quantity.
// Long enough that typing "12" is one save rather than a save of 1 and a save
// of 12; short enough that nobody wonders whether it took.
const SAVE_DELAY = 500;

// The quantity control for one line of the checklist.
//
// The number on screen is local, so a click lands instantly and a run of
// clicks does not queue one round-trip per press.
function Quantity({ row, max, disabled, onSave }) {
  const [value, setValue] = useState(row.quantity);
  const timer = useRef(null);
  // What the next click counts from. A ref, not the state, because two clicks
  // in the same frame both read the SAME rendered `value` — "+ +" on a zero
  // recorded one copy rather than two, which is exactly the gesture somebody
  // counting a box makes.
  const pending = useRef(row.quantity);

  // The parent reloads after every save; follow it, but never mid-typing —
  // a live timer means the local number is the newer truth.
  useEffect(() => {
    if (timer.current) return;
    pending.current = row.quantity;
    setValue(row.quantity);
  }, [row.quantity]);

  // A pending save must not outlive the row (a filter change unmounts it).
  useEffect(() => () => clearTimeout(timer.current), []);

  // What the SERVER is told is the number that survives the pause — an
  // absolute quantity, which is what makes the retry story simple: the last
  // write wins and it says what the shop is looking at.
  const commit = useCallback(
    (next) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        onSave(next, () => {
          pending.current = row.quantity;
          setValue(row.quantity);
        });
      }, SAVE_DELAY);
    },
    [onSave, row.quantity]
  );

  function set(next) {
    const clamped = Math.min(Math.max(next, 0), max);
    pending.current = clamped;
    setValue(clamped);
    commit(clamped);
  }

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <IconButton
        size="small"
        disabled={disabled || value <= 0}
        onClick={() => set(pending.current - 1)}
        aria-label={`${texts.EDITION_COL_QUANTITY} -`}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <TextField
        size="small"
        type="number"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          // An emptied field is a number being retyped, not a zero — keep it
          // blank on screen and save nothing until a digit arrives.
          if (e.target.value === "") {
            clearTimeout(timer.current);
            timer.current = null;
            setValue("");
            return;
          }
          set(parseInt(e.target.value, 10) || 0);
        }}
        onBlur={() => {
          if (value === "") setValue(pending.current);
        }}
        inputProps={{ min: 0, max, style: { textAlign: "center", width: 44 } }}
      />
      <IconButton
        size="small"
        disabled={disabled || value >= max}
        onClick={() => set(pending.current + 1)}
        aria-label={`${texts.EDITION_COL_QUANTITY} +`}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

// A native select over one modifier list (conditions or languages).
function GradeSelect({ label, rows, value, disabled, onChange }) {
  return (
    <TextField
      select
      size="small"
      SelectProps={{ native: true }}
      label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      sx={{ width: 130 }}
    >
      {rows.map((row) => (
        <option key={row.id} value={row.id}>
          {row.name}
        </option>
      ))}
    </TextField>
  );
}

// The fold-out under a checklist row: its copies that are NOT near-mint
// English.
//
// The row's own counter is the near-mint English copies. Each line here is
// MORE copies on top of those — "and two Japanese" — so four on the row plus
// a line of two is six in the box. Changing a line's selects re-labels its
// copies, and taking it to zero takes them out of the box.
function Variations({ row, conditions, languages, max, editable, onSet }) {
  const idOf = (rows, name) => rows.find((r) => r.name === name)?.id ?? "";
  const defaultCondition = idOf(conditions, DEFAULT_CONDITION);
  const defaultLanguage = idOf(languages, DEFAULT_LANGUAGE);
  const isDefault = (c, l) => c === defaultCondition && l === defaultLanguage;

  // The grade the "add" line will create. Starts on the likeliest variation —
  // a near-mint copy in another language — rather than on near-mint English,
  // which is not a variation at all.
  const [newCondition, setNewCondition] = useState(defaultCondition);
  const [newLanguage, setNewLanguage] = useState(
    languages.find((l) => l.id !== defaultLanguage)?.id ?? defaultLanguage
  );

  function add() {
    if (isDefault(newCondition, newLanguage)) {
      toast(texts.EDITION_VARIATION_IS_DEFAULT);
      return;
    }
    const same = row.grades.find(
      (g) => g.conditionid === newCondition && g.languageid === newLanguage
    );
    onSet({
      conditionid: newCondition,
      languageid: newLanguage,
      quantity: (same?.quantity ?? 0) + 1,
    });
  }

  return (
    <Box className="editionVariations" sx={{ ml: { xs: 0, sm: "52px" } }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {texts.EDITION_VARIATIONS_HINT}
        {/* Once there is something to add up, the sum the row no longer
            shows on its own. */}
        {row.grades.length > 0 && (
          <>
            {" "}
            {texts.EDITION_VARIATIONS_TOTAL}
            <b>{row.quantity}</b>.
          </>
        )}
      </Typography>
      <Stack spacing={1}>
        {row.grades.map((g) => (
          <Stack
            key={`${g.conditionid}|${g.languageid}`}
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            {/* Changing a select moves EVERY copy of this line to the new
                grade — the shop correcting what the line is, not adding. */}
            <GradeSelect
              label={texts.CONDITION}
              rows={conditions}
              value={g.conditionid}
              disabled={!editable}
              onChange={(conditionid) =>
                onSet({ conditionid, languageid: g.languageid, quantity: g.quantity, from: g })
              }
            />
            <GradeSelect
              label={texts.LANGUAGE}
              rows={languages}
              value={g.languageid}
              disabled={!editable}
              onChange={(languageid) =>
                onSet({ conditionid: g.conditionid, languageid, quantity: g.quantity, from: g })
              }
            />
            <Quantity
              row={g}
              // The cap is on the row's total, every grade together.
              max={max - (row.quantity - g.quantity)}
              disabled={!editable}
              onSave={(quantity, revert) =>
                onSet(
                  { conditionid: g.conditionid, languageid: g.languageid, quantity },
                  revert
                )
              }
            />
          </Stack>
        ))}
        {editable && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <GradeSelect
              label={texts.CONDITION}
              rows={conditions}
              value={newCondition}
              onChange={setNewCondition}
            />
            <GradeSelect
              label={texts.LANGUAGE}
              rows={languages}
              value={newLanguage}
              onChange={setNewLanguage}
            />
            <Button size="small" startIcon={<AddIcon />} onClick={add}>
              {texts.EDITION_ADD_VARIATION}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

// An edition box, as the set's checklist.
//
// Every other container editor lists the copies that are in it. This one lists
// the SET — every paper printing, every finish it came in, in collector-number
// order — and the shop says how many of each it has. A card the shop has none
// of is not missing from the page; it is a zero, which is the row somebody
// filling the box is actually looking for.
//
// The checklist comes from its own endpoint rather than from the container
// read: "what is in this box" and "what could be in this box" are different
// questions, and only this page asks the second one.
// `reloadKey` changes when the box was filled from outside this editor (an
// import), so the checklist re-reads its quantities without losing the search.
export default function EditionEditor({ unit, editable, onChanged, reloadKey }) {
  const [edition, setEdition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyHeld, setOnlyHeld] = useState(false);
  const [page, setPage] = useState(1);
  // Rows whose variations fold-out is open, by "<scryfallid>|<variant>".
  const [open, setOpen] = useState(() => new Set());
  const [conditions, setConditions] = useState([]);
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    accessAPI(
      "GET",
      "card/modifiers",
      null,
      (response) => {
        setConditions(response.conditions ?? []);
        setLanguages(response.languages ?? []);
      },
      (response) => toast(response.message)
    );
  }, []);

  const toggle = (key) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const load = useCallback(() => {
    accessAPI(
      "GET",
      `storage/${unit.id}/edition`,
      null,
      (response) => {
        setEdition(response);
        setLoading(false);
      },
      (response) => {
        setLoading(false);
        toast(response.message);
      }
    );
  }, [unit.id]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  // Save one line's quantity. The row on screen is already showing the new
  // number (see Quantity), so success only has to reconcile the totals; a
  // failure puts the control back to what the server still holds.
  function save(row, quantity, revert) {
    accessAPI(
      "PUT",
      `storage/${unit.id}/edition`,
      { scryfallid: row.scryfallid, variant: row.variant, quantity },
      () => {
        setEdition((current) => {
          if (!current) return current;
          // `quantity` here is the near-mint English count; the row's total
          // is that plus its variations, which this save did not touch.
          const rows = current.rows.map((other) =>
            other.scryfallid === row.scryfallid && other.variant === row.variant
              ? {
                  ...other,
                  plain: quantity,
                  quantity: other.quantity - other.plain + quantity,
                }
              : other
          );
          return {
            ...current,
            rows,
            total: rows.reduce((sum, r) => sum + r.quantity, 0),
            distinct: rows.filter((r) => r.quantity > 0).length,
          };
        });
        // The container's own card count is in the page header above us.
        if (onChanged) onChanged();
      },
      (response) => {
        toast(`${texts.EDITION_SAVE_FAILED} ${response.message}`);
        revert();
      }
    );
  }

  // Set one variation of a row. The row's total and its chips move with it,
  // so the checklist re-reads afterwards rather than guessing.
  function saveGrade(row, { conditionid, languageid, quantity, from }, revert) {
    accessAPI(
      "PUT",
      `storage/${unit.id}/edition/grade`,
      {
        scryfallid: row.scryfallid,
        variant: row.variant,
        conditionid,
        languageid,
        quantity,
        ...(from && {
          fromconditionid: from.conditionid,
          fromlanguageid: from.languageid,
        }),
      },
      () => {
        load();
        if (onChanged) onChanged();
      },
      (response) => {
        toast(`${texts.EDITION_SAVE_FAILED} ${response.message}`);
        if (revert) revert();
        load();
      }
    );
  }

  if (loading) return <LinearProgress />;
  if (!edition) return null;
  if (!edition.rows.length) {
    return <Alert severity="info">{texts.EDITION_EMPTY_SET}</Alert>;
  }

  // Number search is as useful as name search here: somebody holding a card
  // reads the number off the bottom of it.
  const needle = q.trim().toLowerCase();
  const rows = edition.rows.filter((row) => {
    if (onlyHeld && !row.quantity) return false;
    if (!needle) return true;
    return (
      (row.name ?? "").toLowerCase().includes(needle) ||
      String(row.collectornumber ?? "").toLowerCase().includes(needle)
    );
  });

  // Clamped rather than reset, so filtering down does not throw away the
  // position of somebody working through the box page by page.
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const curPage = Math.min(page, pageCount);
  const visible = rows.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
        sx={{ mb: 1.5 }}
      >
        <TextField
          size="small"
          placeholder={texts.EDITION_SEARCH}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          sx={{ width: 300, maxWidth: "100%" }}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={onlyHeld}
              onChange={(e) => {
                setOnlyHeld(e.target.checked);
                setPage(1);
              }}
            />
          }
          label={texts.EDITION_ONLY_HELD}
        />
        {/* How full the box is — the one number a set box is judged by. */}
        <Typography variant="body2" color="text.secondary">
          {edition.distinct}
          {texts.EDITION_PROGRESS_1}
          {edition.slots}
          {texts.EDITION_PROGRESS_2}
        </Typography>
      </Stack>

      {!editable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {texts.EDITION_LOCKED}
        </Alert>
      )}

      {!rows.length && (
        <Alert severity="info">{texts.EDITION_NO_MATCHES}</Alert>
      )}

      <Stack spacing={0.75}>
        {visible.map((row) => {
          const key = `${row.scryfallid}|${row.variant}`;
          const expanded = open.has(key);
          return (
            <Box key={key}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                className="boxRow"
                // A row the shop has none of is still worth reading, just quieter
                // than the ones it does.
                sx={{ opacity: row.quantity ? 1 : 0.62 }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 40, flexShrink: 0 }}
                >
                  {row.collectornumber}
                </Typography>
                <PreviewCarta
                  image={row.image}
                  name={row.name}
                  small
                  sx={{ width: 38, height: 53, borderRadius: 0.5 }}
                />
                {/* Name and finish travel TOGETHER, and this group is the one
                    that stretches. Letting the name stretch on its own pushed the
                    Foil chip across the row to sit beside the quantity, where it
                    read as a label for the number rather than for the card. */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ flex: "1 1 160px", minWidth: 0 }}
                >
                  <Typography noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
                    {row.name}
                  </Typography>
                  {isFoil(row.variant) && (
                    <Chip
                      size="small"
                      color="secondary"
                      label={finishLabel(row.variant)}
                      sx={{ flexShrink: 0 }}
                    />
                  )}
                  {/* Which of the copies differ, at a glance: "1 Japonés". */}
                  {row.grades.map((g) => (
                    <Chip
                      key={`${g.conditionid}|${g.languageid}`}
                      size="small"
                      variant="outlined"
                      label={`+${g.quantity} ${gradeLabel(g)}`}
                      sx={{ flexShrink: 0 }}
                    />
                  ))}
                </Stack>
                {/* Copies promised to a buyer are in a bag on the counter, not in
                    the box. Said out loud so a count that comes up short reads as
                    correct rather than as a card gone missing. */}
                {row.bagged > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {texts.EDITION_BAGGED_1}
                    {row.bagged}
                    {texts.EDITION_BAGGED_2}
                  </Typography>
                )}
                <Stack direction="row" alignItems="center" sx={{ ml: "auto" }}>
                  {/* Only once the lists have arrived: the fold-out is nothing
                      but selects over them. */}
                  {conditions.length > 0 && languages.length > 0 && (editable || row.grades.length > 0) && (
                    <IconButton
                      size="small"
                      title={texts.EDITION_VARIATIONS}
                      aria-label={texts.EDITION_VARIATIONS}
                      aria-expanded={expanded}
                      color={expanded || row.grades.length ? "primary" : "default"}
                      onClick={() => toggle(key)}
                    >
                      <TuneIcon fontSize="small" />
                    </IconButton>
                  )}
                  {/* The row's own counter is its near-mint English copies;
                      the variations add to it (see Variations). */}
                  <Quantity
                    row={{ quantity: row.plain }}
                    max={edition.max - (row.quantity - row.plain)}
                    disabled={!editable}
                    onSave={(quantity, revert) => save(row, quantity, revert)}
                  />
                </Stack>
              </Stack>
              {expanded && (
                <Variations
                  row={row}
                  conditions={conditions}
                  languages={languages}
                  max={edition.max}
                  editable={editable}
                  onSet={(change, revert) => saveGrade(row, change, revert)}
                />
              )}
            </Box>
          );
        })}
      </Stack>

      {pageCount > 1 && (
        <Pagination
          count={pageCount}
          page={curPage}
          onChange={(e, next) => setPage(next)}
          sx={{ display: "flex", justifyContent: "center", my: 1.5 }}
        />
      )}
    </>
  );
}
