import React, { useState, useEffect } from "react";
import { toast } from "../utils/toast";
import { confirmDialog } from "../utils/confirm";
import texts from "../data/texts";
import { accessAPI } from "../utils/fetchFunctions";
import { isFoil, finishLabel } from "../utils/finishes";
import "./orders.css";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Title from "../elementos/Title";

// The wishlist match queue: cards in stock that answer somebody's wish,
// grouped by customer, each with the two actions that resolve it — into the
// bag, or not this copy.
//
// Its own component because this is the work the shop would otherwise never
// notice (a match appears without anyone doing anything), and it now lives on
// the home page for exactly that reason: it is the first thing to see when
// opening the till, not something buried under the order list.
export default function MatchQueue() {
  const [matches, setMatches] = useState([]);
  // Which copy the shop is taking, per match, when there is more than one.
  const [chosen, setChosen] = useState({});

  function load() {
    accessAPI(
      "GET",
      "admin/match",
      null,
      (response) => setMatches(response),
      () => setMatches([])
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function actOnMatch(match, action, confirmText) {
    if (confirmText && !(await confirmDialog(confirmText))) return;
    accessAPI(
      "POST",
      `admin/match/${match.id}/${action}`,
      // Tell the API which copy was physically taken, so a later cancellation
      // refiles it where it actually came from.
      action === "setaside" && chosen[match.id]
        ? { placementid: chosen[match.id] }
        : null,
      () => load(),
      (response) => toast(response.message)
    );
  }

  // One line of "where the card is", in the terms that container supports.
  function locationLabel(location) {
    if (location.storagetype === "binder") {
      return `${location.storagename} — ${texts.PAGE} ${location.page}, ${texts.IN_POCKET} ${location.pocket}${
        location.depth > 1 ? ` (${texts.DEPTH} ${location.depth})` : ""
      }`;
    }
    if (location.storagetype === "sorted_box") {
      return `${location.storagename} — ${texts.POSITION_IN_BOX} ${location.sequence}`;
    }
    return location.storagename;
  }

  // Rows that answer the SAME wish, kept together: they are alternatives, not
  // separate wants, and resolving one resolves them all.
  function groupByWish(personMatches) {
    const groups = [];
    const byWish = new Map();
    for (const match of personMatches) {
      if (!byWish.has(match.wishlistid)) {
        const group = [];
        byWish.set(match.wishlistid, group);
        groups.push(group);
      }
      byWish.get(match.wishlistid).push(match);
    }
    return groups;
  }

  const total = matches.reduce((n, person) => n + person.matches.length, 0);

  return (
    <>
      <Title
        title={texts.MATCHES_TITLE}
        subtitle={texts.MATCHES_HINT}
        tags={total > 0 ? [{ label: String(total), color: "secondary" }] : []}
      />
      {!matches.length && <div className="emptyState">{texts.NO_MATCHES}</div>}
      {matches.map((person) => (
        <div className="matchCard" key={person.playerid}>
          <div className="matchPlayer">{person.name}</div>
          {groupByWish(person.matches).map((group) => (
            <div className="matchGroup" key={group[0].wishlistid}>
              {/* Several rows, ONE wish: these are alternative versions that
                  each answer the same want. Said out loud, because bagging one
                  makes the others withdraw — which otherwise reads as rows
                  vanishing for no reason. */}
              {group.length > 1 && (
                <div className="matchAlternativesHint">
                  {texts.WANTS} {group[0].wantedQuantity} ·{" "}
                  {texts.ANY_VERSION_OK}
                  {group[0].baggedQuantity > 0 &&
                    ` · ${group[0].baggedQuantity} ${texts.ALREADY_IN_BAG}`}
                </div>
              )}
              {group.map((match) => (
            <div className="matchBlock" key={match.id}>
              <div className="matchRow">
                {match.image && (
                  <img className="matchThumb" src={match.image} alt={match.name} />
                )}
                <span className="lineName">{match.name}</span>
                <span className="lineSet">
                  {(match.cardsetcode ?? "").toUpperCase()}
                </span>
                <span className="lineMeta">{match.condition}</span>
                <span className="lineMeta">{match.language}</span>
                {isFoil(match.variant) && (
                  <span className="lineMeta">{finishLabel(match.variant)}</span>
                )}
                {/* A withdrawal is the customer's own consigned card: it goes
                    in the bag but nothing is charged for it. */}
                <span
                  className={
                    match.kind === "withdrawal"
                      ? "matchKind withdrawal"
                      : "matchKind purchase"
                  }
                  title={
                    match.kind === "withdrawal"
                      ? texts.MATCH_WITHDRAWAL_HINT
                      : undefined
                  }
                >
                  {match.kind === "withdrawal"
                    ? texts.MATCH_WITHDRAWAL
                    : texts.MATCH_PURCHASE}
                </span>
                <span className="linePrice">
                  {match.kind === "withdrawal"
                    ? "—"
                    : `U$S ${match.price ?? "?"}`}
                </span>
                {/* Stock moved since this match was found — bagged for someone
                    else, sold, or its container went home. Said out loud and
                    the button disarmed, instead of letting the click end in an
                    error; the next matcher run clears the row. */}
                {match.available < 1 && (
                  <span className="matchNoLocation">{texts.NO_STOCK_NOW}</span>
                )}
                <Button size="small"
                  disabled={match.available < 1}
                  onClick={() => actOnMatch(match, "setaside")}
                >
                  {texts.SET_ASIDE}
                </Button>
                <Button variant="outlined" color="error" size="small"
                  onClick={() =>
                    actOnMatch(match, "dismiss", texts.CONFIRM_DISMISS_MATCH)
                  }
                >
                  {texts.DISMISS_MATCH}
                </Button>
              </div>

              {/* Where to actually go and get this one. Two rows can share a
                  card name, so this has to sit with its own row. */}
              <div className="matchWhere">
                <span className="matchWhereLabel">{texts.WHERE_IS_IT}:</span>
                {!match.locations.length && (
                  <span className="matchNoLocation">{texts.NO_LOCATION}</span>
                )}
                {match.locations.length === 1 && (
                  <span>{locationLabel(match.locations[0])}</span>
                )}
                {/* Several copies on the shelf: the shop says which one they
                    took, so a cancellation refiles the right one. */}
                {match.locations.length > 1 && (
                  <TextField select SelectProps={{ native: true }}
                    value={chosen[match.id] ?? match.locations[0].placementid}
                    onChange={(e) =>
                      setChosen({
                        ...chosen,
                        [match.id]: parseInt(e.target.value, 10),
                      })
                    }
                  >
                    {match.locations.map((location) => (
                      <option
                        value={location.placementid}
                        key={location.placementid}
                      >
                        {locationLabel(location)}
                      </option>
                    ))}
                  </TextField>
                )}
              </div>
            </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
