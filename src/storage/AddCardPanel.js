import React, { useState, useEffect, useRef } from "react";
import { toast } from "../utils/toast";
import "./addCard.css";
import { accessAPI } from "../utils/fetchFunctions";
import { finishesFor, finishLabel, DEFAULT_FINISH } from "../utils/finishes";
import texts from "../data/texts";
import CatalogueSearch from "./CatalogueSearch";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Radio from "@mui/material/Radio";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// One page of printings. Big enough that most cards fit in one request, small
// enough that a basic land's 800+ printings stream in as you scroll.
const VERSIONS_PAGE = 60;

// The add-a-card flow for the shop's own containers, shaped for a sidebar:
// name autocomplete on top, then the printings of the picked name as compact
// rows. Picking a row asks for condition, language, quantity and finish, then
// every copy is filed into the container — a binder's land in stand-by to be
// dragged into pockets, a box's go straight in. Nothing closes afterwards:
// adding several cards in a row is the normal case, so the panel stays where
// the user left it.
//
// Same flow as the customer's AddCardPanel, on the staff endpoint: the API
// creates the card in the staff member's collection and places the copy in one
// step, so there is no instant where a card exists with nowhere to be.
export default function AddCardPanel({ unit, onAdded }) {
  const [chosenName, setChosenName] = useState(null);
  const [versions, setVersions] = useState([]);
  const [versionsTotal, setVersionsTotal] = useState(0);
  const [setFilter, setSetFilter] = useState("");
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  // Which finish of the selected printing is being added.
  const [selectedFinish, setSelectedFinish] = useState(DEFAULT_FINISH);
  const [addLoader, setAddLoader] = useState(false);
  const [conditions, setConditions] = useState(null);
  const [languages, setLanguages] = useState(null);

  const conditionRef = useRef(null);
  const languageRef = useRef(null);
  const quantityRef = useRef(null);

  useEffect(() => {
    accessAPI(
      "GET",
      "card/modifiers",
      null,
      (response) => {
        setConditions(response.conditions);
        setLanguages(response.languages);
      },
      (response) => toast(response.message)
    );
  }, []);

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

  function selectVersion(version) {
    setSelectedVersion(version);
    // Reset to the printing's first available finish — the previous choice may
    // not even exist for this one.
    setSelectedFinish(finishesFor(version)[0] ?? DEFAULT_FINISH);
  }

  // File `remaining` copies into the container, one request at a time.
  // Sequential rather than fired together: each call assigns the next free
  // copyindex, so simultaneous requests would race for the same copy.
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

  function addVersion() {
    setAddLoader(true);
    const quantity = parseInt(quantityRef.current.value, 10);
    // The printing decides what is possible; default to its only finish.
    const variant = selectedFinish ?? finishesFor(selectedVersion)[0];
    addCopies(
      {
        scryfallid: selectedVersion.scryfallid,
        conditionid: conditionRef.current.value,
        languageid: languageRef.current.value,
        variant,
      },
      quantity,
      (ok) => {
        setSelectedVersion(null);
        setAddLoader(false);
        if (ok) {
          toast(
            `${quantity}× ${selectedVersion.name} — ${texts.ADDED_TO_CONTAINER} ${unit.name}`,
            "success"
          );
          onAdded();
        }
      }
    );
  }

  return (
    <Box>
      <CatalogueSearch
        onPick={(name) => {
          setChosenName(name);
          setSetFilter("");
        }}
      />
      {chosenName && (
        <>
          <Stack spacing={1} sx={{ mb: 1 }}>
            <TextField
              id="setFilter"
              size="small"
              label={texts.FILTER_BY_SET}
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              fullWidth
            />
            <Typography variant="caption" color="text.secondary">
              {versions.length} {texts.OF} {versionsTotal} {texts.VERSIONS}
            </Typography>
          </Stack>
          {!versionsLoading && versionsTotal === 0 && (
            <Alert severity="info">{texts.NO_VERSIONS}</Alert>
          )}
          <List dense disablePadding>
            {versions.map((version, index) => (
              <ListItemButton
                key={version.scryfallid ?? index}
                onClick={() => selectVersion(version)}
                sx={{ px: 0.5, gap: 1 }}
              >
                {version.image && (
                  <Box
                    component="img"
                    src={version.image}
                    alt={version.name}
                    loading="lazy"
                    sx={{
                      width: 32,
                      height: 45,
                      borderRadius: 0.5,
                      flex: "0 0 auto",
                    }}
                  />
                )}
                <ListItemText
                  primary={version.cardsetname}
                  secondary={[
                    version.collectornumber && `#${version.collectornumber}`,
                    version.releasedatyear,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </ListItemButton>
            ))}
          </List>
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

      <Dialog
        open={Boolean(selectedVersion && conditions && languages)}
        onClose={() => !addLoader && setSelectedVersion(null)}
      >
        {selectedVersion && conditions && languages && (
          <>
            <DialogTitle>{selectedVersion.name}</DialogTitle>
            <DialogContent>
              <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                <div className="cardImage">
                  <img src={selectedVersion.image} alt="selected" />
                </div>
                <Stack spacing={2} sx={{ minWidth: 190 }}>
                  <TextField select SelectProps={{ native: true }}
                    name="conditions"
                    id="conditions"
                    label={texts.CONDITION}
                    inputRef={conditionRef}
                  >
                    {conditions.map((condition) => (
                      <option key={condition.id} value={condition.id}>
                        {condition.name}
                      </option>
                    ))}
                  </TextField>
                  <TextField select SelectProps={{ native: true }}
                    name="languages"
                    id="languages"
                    label={texts.LANGUAGE}
                    inputRef={languageRef}
                  >
                    {languages.map((language) => (
                      <option key={language.id} value={language.id}>
                        {language.name}
                      </option>
                    ))}
                  </TextField>
                  <TextField select SelectProps={{ native: true }}
                    name="quantity"
                    id="quantity"
                    label={texts.QUANTITY}
                    inputRef={quantityRef}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </TextField>
                  <div className="finishPicker">
                    {/* Offered finishes come from THIS printing. Half of all
                        printings exist in only one, and a single option is
                        stated rather than presented as a choice. */}
                    {finishesFor(selectedVersion).length === 1 && (
                      <span className="onlyFinish">
                        {texts.ONLY_FINISH}{" "}
                        {finishLabel(finishesFor(selectedVersion)[0])}
                      </span>
                    )}
                    {finishesFor(selectedVersion).length > 1 &&
                      finishesFor(selectedVersion).map((finish) => (
                        <FormControlLabel
                          key={finish}
                          className="finishOption"
                          control={
                            <Radio
                              size="small"
                              name="finish"
                              value={finish}
                              checked={selectedFinish === finish}
                              onChange={() => setSelectedFinish(finish)}
                            />
                          }
                          label={finishLabel(finish)}
                        />
                      ))}
                  </div>
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                variant="outlined"
                disabled={addLoader}
                onClick={() => setSelectedVersion(null)}
              >
                {texts.CANCEL}
              </Button>
              <Button loading={addLoader} onClick={addVersion}>
                {texts.ADD}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
