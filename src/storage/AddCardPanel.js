import React, { useState, useEffect, useRef } from "react";
import { toast } from "../utils/toast";
import "./addCard.css";
import { accessAPI } from "../utils/fetchFunctions";
import { finishesFor, finishLabel, isFoil, DEFAULT_FINISH } from "../utils/finishes";
import texts from "../data/texts";
import CatalogueSearch from "./CatalogueSearch";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";

// One page of printings. Big enough that most cards fit in one request, small
// enough that a basic land's 800+ printings stream in as you scroll.
const VERSIONS_PAGE = 60;

// One printing, ready to add: its own finish choice, quantity and button, so
// adding is a single click on the row itself — the confirmation dialog this
// replaced made every add a two-step conversation. Condition and language are
// not asked for (2026-08-23, the shop's call): a manual add is recorded as NM
// English by the API.
//
// The finish toggle only appears when the printing actually offers a choice.
// Half of all printings exist in one finish; those state it (a chip when it
// is a foil worth mentioning, nothing when it is plain nonfoil).
function VersionRow({
  version,
  onAdd,
  changing = false,
  current = false,
  currentVariant = null,
}) {
  const finishes = finishesFor(version);
  // In change mode the row for the copy's CURRENT printing starts on its
  // current finish, so "change only the finish" is one toggle away.
  const [finish, setFinish] = useState(
    current && currentVariant && finishes.includes(currentVariant)
      ? currentVariant
      : finishes[0] ?? DEFAULT_FINISH
  );
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 1.5,
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {version.image ? (
        <Box
          component="img"
          src={version.image}
          alt={version.name}
          loading="lazy"
          sx={{ width: 40, height: 56, borderRadius: 0.5, flex: "0 0 auto" }}
        />
      ) : (
        <Box
          sx={{
            width: 40,
            height: 56,
            borderRadius: 0.5,
            border: "1px dashed #ccc",
            flex: "0 0 auto",
          }}
        />
      )}
      <Box sx={{ flex: "1 1 150px", minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          {version.cardsetname}
          {version.cardsetcode && ` (${version.cardsetcode.toUpperCase()})`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {[
            version.collectornumber && `#${version.collectornumber}`,
            version.releasedatyear,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
      </Box>
      {finishes.length > 1 ? (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={finish}
          onChange={(e, next) => next && setFinish(next)}
        >
          {finishes.map((option) => (
            <ToggleButton key={option} value={option} sx={{ px: 1.25 }}>
              {finishLabel(option)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      ) : (
        isFoil(finishes[0]) && (
          <Chip size="small" color="secondary" label={finishLabel(finishes[0])} />
        )
      )}
      {current && (
        <Chip
          size="small"
          variant="outlined"
          color="success"
          label={texts.CURRENT_VERSION}
        />
      )}
      {!changing && (
        <TextField
          select
          SelectProps={{ native: true }}
          size="small"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
          sx={{ width: 64 }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </TextField>
      )}
      <Button
        size="small"
        disabled={adding}
        onClick={() => {
          setAdding(true);
          onAdd(version, finish, quantity, () => setAdding(false));
        }}
      >
        {changing ? texts.CHOOSE_VERSION : texts.ADD}
      </Button>
    </Box>
  );
}

// The add-a-card flow for the shop's own containers, shaped for a wide
// sidebar: name autocomplete on top, then the printings of the picked name as
// rows that each carry their own finish, quantity and add button. Nothing
// closes afterwards: adding several cards in a row is the normal case, so the
// panel stays where the user left it.
//
// Same flow as the customer's AddCardPanel, on the staff endpoint: the API
// creates the card in the staff member's collection and places the copy in one
// step, so there is no instant where a card exists with nowhere to be.
export default function AddCardPanel({
  unit,
  onAdded,
  // Change mode: the panel opens already searched for THIS card, hides the
  // name picker and quantity, and each row's button hands the chosen
  // printing+finish to `onChangeVersion` instead of adding a copy.
  changeTarget = null,
  onChangeVersion,
}) {
  const [chosenName, setChosenName] = useState(null);
  const [versions, setVersions] = useState([]);
  const [versionsTotal, setVersionsTotal] = useState(0);
  const [setFilter, setSetFilter] = useState("");
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Change mode arms the search with the card being edited, every time a
  // different card is picked for editing.
  useEffect(() => {
    if (!changeTarget) return;
    setChosenName(changeTarget.name);
    setSetFilter("");
  }, [changeTarget]);

  // The first page of printings for the picked name and set filter. Debounced
  // because the filter refetches per keystroke; the picked name rides the same
  // effect (a 250ms pause after choosing is imperceptible). The cancelled flag
  // keeps a slow older answer from landing on top of a newer one.
  useEffect(() => {
    if (!chosenName) {
      setVersions([]);
      setVersionsTotal(0);
      return;
    }
    let cancelled = false;
    setVersionsLoading(true);
    const timer = setTimeout(() => {
      accessAPI(
        "GET",
        `card/versions/${encodeURIComponent(chosenName)}?exact=1&limit=${VERSIONS_PAGE}&offset=0` +
          (setFilter.trim() ? `&set=${encodeURIComponent(setFilter.trim())}` : ""),
        null,
        (response) => {
          if (cancelled) return;
          setVersions(response.cards);
          setVersionsTotal(response.total);
          setVersionsLoading(false);
        },
        (response) => {
          if (cancelled) return;
          toast(response.message);
          setVersionsLoading(false);
        }
      );
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chosenName, setFilter]);

  // The pages after the first, pulled in as the bottom of the list scrolls
  // into view — nobody pages through 800 Plains by hand.
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (versionsLoading || versions.length >= versionsTotal) return;
        setVersionsLoading(true);
        accessAPI(
          "GET",
          `card/versions/${encodeURIComponent(chosenName)}?exact=1&limit=${VERSIONS_PAGE}&offset=${versions.length}` +
            (setFilter.trim() ? `&set=${encodeURIComponent(setFilter.trim())}` : ""),
          null,
          (response) => {
            setVersions((prev) => [...prev, ...response.cards]);
            setVersionsTotal(response.total);
            setVersionsLoading(false);
          },
          (response) => {
            toast(response.message);
            setVersionsLoading(false);
          }
        );
      },
      // Start fetching a screen early so scrolling never actually hits bottom.
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [chosenName, setFilter, versions.length, versionsTotal, versionsLoading]);

  // File `remaining` copies into the container, one request at a time: the
  // API creates-or-grows the card row and places the new copy in one step, so
  // simultaneous requests would race for the same copy index.
  function addCopies(body, remaining, done) {
    if (remaining <= 0) {
      done(true);
      return;
    }
    accessAPI(
      "POST",
      `storage/${unit.id}/add`,
      body,
      () => addCopies(body, remaining - 1, done),
      (response) => {
        toast(response.message);
        done(false);
      }
    );
  }

  // Add straight from the row.
  function addVersion(version, variant, quantity, done) {
    addCopies(
      {
        scryfallid: version.scryfallid,
        variant,
      },
      quantity,
      (ok) => {
        done();
        if (ok) {
          toast(
            `${quantity}× ${version.name} — ${texts.ADDED_TO_CONTAINER} ${unit.name}`,
            "success"
          );
          onAdded();
        }
      }
    );
  }

  return (
    <Box>
      {/* One row: the card picker does the heavy lifting and keeps the
          width; the set filter rides beside it, short — a set name or code
          is a few characters. Always visible, so a set can be typed before
          the card is even picked, and the same height as the picker so the
          two read as one control row. */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
          {/* Changing a version is about ONE card; the name is fixed. */}
          {!changeTarget && <CatalogueSearch onPick={setChosenName} />}
        </Box>
        <TextField
          id="setFilter"
          label={texts.FILTER_BY_SET_SHORT}
          value={setFilter}
          onChange={(e) => setSetFilter(e.target.value)}
          sx={{ width: 170, flex: "0 0 auto" }}
        />
      </Stack>
      {chosenName && (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {versions.length} {texts.OF} {versionsTotal} {texts.VERSIONS}
          </Typography>
          {!versionsLoading && versionsTotal === 0 && (
            <Alert severity="info">{texts.NO_VERSIONS}</Alert>
          )}
          {versions.map((version, index) => (
            <VersionRow
              key={version.scryfallid ?? index}
              version={version}
              changing={Boolean(changeTarget)}
              current={changeTarget?.scryfallid === version.scryfallid}
              currentVariant={changeTarget?.variant ?? null}
              onAdd={
                changeTarget
                  ? (picked, finish, quantity, done) =>
                      onChangeVersion(picked, finish, done)
                  : addVersion
              }
            />
          ))}
          {/* Watched by an IntersectionObserver: scrolling it into view loads
              the next page of printings. */}
          <div ref={sentinelRef} className="versionsSentinel">
            {versionsLoading && (
              <Typography variant="caption" color="text.secondary">
                {texts.LOADING_VERSIONS}
              </Typography>
            )}
          </div>
        </>
      )}
    </Box>
  );
}
