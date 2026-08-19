import React, { useState, useEffect, useRef } from "react";
import { toast } from "../utils/toast";
import { accessAPI } from "../utils/fetchFunctions";
import texts from "../data/texts";
import CatalogueSearch from "../storage/CatalogueSearch";
import "../storage/addCard.css";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// One page of printings. Big enough that most cards fit in one request, small
// enough that a basic land's 800+ printings stream in as you scroll.
const VERSIONS_PAGE = 60;

// The fix-a-price flow, shaped for the sidebar: the same name autocomplete and
// version browser as adding a card to a container, but each printing carries
// the two price boxes directly — fixing a price is one number per side, not a
// condition-and-quantity conversation. Fijar locks every stock row of that
// printing; a version with no stock is refused by the API and the message
// says so.
export default function FixedPriceSidebar({ onFixed }) {
  const [chosenName, setChosenName] = useState(null);
  const [versions, setVersions] = useState([]);
  const [versionsTotal, setVersionsTotal] = useState(0);
  const [setFilter, setSetFilter] = useState("");
  const [versionsLoading, setVersionsLoading] = useState(false);
  // What has been typed into each version's boxes, keyed by scryfallid.
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(null);

  // The first page of printings for the picked name and set filter. Debounced
  // because the filter refetches per keystroke; the cancelled flag keeps a
  // slow older answer from landing on top of a newer one.
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
  // into view.
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
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [chosenName, setFilter, versions.length, versionsTotal, versionsLoading]);

  function edit(scryfallid, field, value) {
    setEdits((prev) => ({
      ...prev,
      [scryfallid]: { ...prev[scryfallid], [field]: value },
    }));
  }

  function fix(version) {
    const current = edits[version.scryfallid] ?? {};
    const price = (current.price ?? "").trim();
    const buyprice = (current.buyprice ?? "").trim();
    // An empty side is left following the market — but both empty fixes
    // nothing at all.
    if (!price && !buyprice) return;

    setSaving(version.scryfallid);
    accessAPI(
      "PUT",
      "admin/prices/fixed",
      {
        scryfallid: version.scryfallid,
        ...(price ? { price: Number(price) } : {}),
        ...(buyprice ? { buyprice: Number(buyprice) } : {}),
      },
      (response) => {
        setSaving(null);
        // Pinning an out-of-stock version is the point, not an error — the
        // price sits on the printing and stamps the first copy that arrives.
        toast(
          response.updated > 0
            ? `${texts.FIXED_SET_PREFIX}${response.updated}${texts.FIXED_SET_SUFFIX}`
            : texts.FIXED_SET_NO_STOCK,
          "success"
        );
        onFixed();
      },
      (response) => {
        setSaving(null);
        toast(response.message);
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
          <Stack>
            {/* Two lines per printing: the drawer is narrow, and squeezing the
                set name beside two price boxes left nothing legible. */}
            {versions.map((version) => (
              <Stack
                key={version.scryfallid}
                spacing={0.75}
                sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  {version.image && (
                    <Box
                      component="img"
                      src={version.image}
                      alt={version.name}
                      loading="lazy"
                      sx={{ width: 32, height: 45, borderRadius: 0.5, flex: "0 0 auto" }}
                    />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {version.cardsetname}
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
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    type="number"
                    size="small"
                    label={texts.COL_SELL}
                    inputProps={{ step: 0.01, min: 0 }}
                    value={edits[version.scryfallid]?.price ?? ""}
                    onChange={(e) => edit(version.scryfallid, "price", e.target.value)}
                    sx={{ width: 100 }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    label={texts.COL_BUY}
                    inputProps={{ step: 0.01, min: 0 }}
                    value={edits[version.scryfallid]?.buyprice ?? ""}
                    onChange={(e) =>
                      edit(version.scryfallid, "buyprice", e.target.value)
                    }
                    sx={{ width: 100 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={saving === version.scryfallid}
                    onClick={() => fix(version)}
                  >
                    {texts.FIX_PRICE}
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
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
