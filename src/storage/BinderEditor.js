import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import texts from "../data/texts";
import { isFoil, finishLabel } from "../utils/finishes";
import { DraggableCard, Pocket, StandbyZone } from "./BinderPieces";
import "./binder.css";

// A binder, as two facing pages you can drag cards around.
//
// Page 1 sits alone on the right, like opening a real binder — the spread
// arithmetic is the API's (spreadForPage / pagesInSpread) and the page numbers
// come down with the contents, so this does not recompute it.
//
// Two levels of permission, because holding a binder and owning its cards are
// different things:
//
//   `arrange` — dragging cards between pockets and the stand-by area. Whoever
//               physically holds the binder can do this.
//   `mutate`  — adding, duplicating and removing copies. Only the owner of the
//               cards can do this.
//
// The stand-by area shows two kinds of card. A card DRAGGED there is only
// lifted on screen: its placement keeps its pocket until it is dropped
// somewhere else, so navigating away mid-sort leaves it exactly where it was —
// never outside the binder. A card that arrives by add or duplicate really has
// no pocket yet (page and pocket null on the server), which is why leaving
// with those still waiting warns first.
export default function BinderEditor({
  unit,
  arrange,
  mutate,
  withdrawable,
  onMove,
  onDuplicate,
  onRemove,
  onWithdraw,
  onShiftPage,
  onReorderPocket,
  onEditVersion,
}) {
  const [activeCard, setActiveCard] = useState(null);
  const [expanded, setExpanded] = useState(null);
  // The open pocket's stack in its optimistic order (placement ids, front
  // first) — set the moment an arrow is clicked so the dialog reorders
  // instantly instead of after the save round-trip. Reset per pocket; the
  // parent's reload brings the server's (same) order behind it.
  const [stackOrder, setStackOrder] = useState(null);

  // Placements lifted to the stand-by area ON SCREEN ONLY — still filed in
  // their pockets as far as the server knows. Local state on purpose: a
  // reload dropping the lift is the feature, not a bug.
  const [lifted, setLifted] = useState(() => new Set());

  // Where a just-dropped card sits ON SCREEN while its move saves. Without
  // this the card flashed back to its old pocket between the drop and the
  // reload — confusing, since the drop looked like it failed. The overrides
  // clear whenever fresh server data arrives: on success it agrees, and on a
  // failed move the parent reloads, which snaps the card back (with a toast
  // saying why).
  const [movedTo, setMovedTo] = useState(() => new Map());
  useEffect(() => {
    setMovedTo(new Map());
  }, [unit]);

  // A few pixels of movement before a drag starts, so clicking a stacked
  // pocket to open it is not read as the beginning of a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // One spread at a time, like holding the binder open. The arithmetic is the
  // API's (spread 0 is [null, 1] — page 1 has nothing facing it), mirrored here
  // because navigation is a view concern: the whole binder is already loaded,
  // the spread only decides which two pages are on screen.
  const spreadForPage = (page) => (page <= 1 ? 0 : Math.floor(page / 2));
  const pagesInSpread = (s) => (s <= 0 ? [null, 1] : [s * 2, s * 2 + 1]);

  // A page "exists" because cards sit on it — the API only sends occupied
  // pages. Empty pages still render (as drop targets), synthesized from the
  // page number. `desiredPages` tracks pages the user opened past the last
  // occupied one: turning past the end adds a fresh spread, which becomes real
  // the moment a card lands on it. Until then it is only this session's, which
  // is also how a spread is "removed" — leave it empty.
  const [spread, setSpread] = useState(0);
  const [desiredPages, setDesiredPages] = useState(0);

  const rawPages = (unit.pages ?? []).filter(Boolean);
  const rawStandby = unit.standby ?? [];

  // Any card, wherever the SERVER has it — pockets or stand-by — for
  // re-rendering it at an optimistic position.
  const findRaw = (placementid) =>
    rawPages
      .flatMap((page) => page.pockets)
      .flatMap((pocket) => pocket.cards)
      .find((c) => c.placementid === placementid) ??
    rawStandby.find((c) => c.placementid === placementid) ??
    null;

  // Lifted cards leave their pockets on screen and join the stand-by area;
  // moved cards render in the pocket they were DROPPED on, not where the
  // server still has them. Everything below renders from this view.
  const pages = rawPages.map((page) => ({
    ...page,
    pockets: page.pockets.map((pocket) => {
      let cards = pocket.cards.filter(
        (c) => !lifted.has(c.placementid) && !movedTo.has(c.placementid)
      );
      for (const [placementid, target] of movedTo) {
        if (target.page === page.page && target.pocket === pocket.pocket) {
          const card = findRaw(placementid);
          if (card) cards = [...cards, card];
        }
      }
      return { ...pocket, cards };
    }),
  }));
  const liftedCards = rawPages
    .flatMap((page) => page.pockets)
    .flatMap((pocket) => pocket.cards)
    .filter((c) => lifted.has(c.placementid));
  // Persisted stand-by first: those are the cards that genuinely have no
  // pocket, and the warning on leaving is about them. A stand-by card
  // optimistically dropped into a pocket has left this list on screen.
  const persistedStandby = rawStandby.filter(
    (c) => !movedTo.has(c.placementid)
  );
  const persistedIds = new Set(rawStandby.map((c) => c.placementid));
  // Copies of the same card sit TOGETHER: a duplicate is another copy of the
  // same card row, so slotting each card in after the last one that shares
  // its card id puts a fresh duplicate right next to the one that spawned it
  // instead of at the end of the list.
  const standby = [];
  for (const card of [...persistedStandby, ...liftedCards]) {
    const at = standby.findLastIndex((c) => c.cardid === card.cardid);
    if (at >= 0) standby.splice(at + 1, 0, card);
    else standby.push(card);
  }

  const filled = new Map(pages.map((p) => [p.page, p]));
  const pocketsPerPage = pages[0]?.pockets.length ?? 9;
  const lastPage = Math.max(unit.maxPage ?? 1, desiredPages);
  const lastSpread = spreadForPage(lastPage);
  const atLast = spread >= lastSpread;

  const pageAt = (n) =>
    n === null
      ? null
      : filled.get(n) ?? {
          page: n,
          pockets: Array.from({ length: pocketsPerPage }, (_, k) => ({
            pocket: k + 1,
            cards: [],
          })),
        };
  const visiblePages = pagesInSpread(spread).map(pageAt);

  function turnForward() {
    if (!atLast) {
      setSpread(spread + 1);
      return;
    }
    // Past the last spread there is no paper yet: turning the page IS adding
    // two more, for whoever is allowed to arrange.
    if (!arrange) return;
    setDesiredPages((spread + 1) * 2 + 1);
    setSpread(spread + 1);
  }

  const findCard = (placementid) => {
    for (const page of rawPages) {
      for (const pocket of page.pockets) {
        const hit = pocket.cards.find((c) => c.placementid === placementid);
        if (hit) return hit;
      }
    }
    return (
      persistedStandby.find((c) => c.placementid === placementid) ?? null
    );
  };

  // Lift a card to the stand-by area — on screen only. Its placement keeps
  // its pocket, so backing out of the edit leaves the binder untouched.
  function lift(placementid) {
    setLifted((prev) => new Set(prev).add(placementid));
  }

  function handleDragStart(event) {
    setActiveCard(findCard(event.active.data.current?.placementid));
  }

  function handleDragEnd(event) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const placementid = active.data.current?.placementid;
    if (!placementid) return;

    if (over.id === "standby") {
      // Coming back out of an optimistic pocket drop returns the card to the
      // stand-by area on screen; a card already waiting there has nothing to
      // lift.
      setMovedTo((prev) => {
        if (!prev.has(placementid)) return prev;
        const next = new Map(prev);
        next.delete(placementid);
        return next;
      });
      if (!persistedIds.has(placementid)) lift(placementid);
      return;
    }
    const target = over.data.current;
    if (target?.page) {
      // Dropping into a pocket is the moment the move becomes real — and the
      // card shows up there IMMEDIATELY, while the save runs behind it.
      setLifted((prev) => {
        if (!prev.has(placementid)) return prev;
        const next = new Set(prev);
        next.delete(placementid);
        return next;
      });
      setMovedTo((prev) =>
        new Map(prev).set(placementid, {
          page: target.page,
          pocket: target.pocket,
        })
      );
      onMove(placementid, { page: target.page, pocket: target.pocket });
    }
  }

  const expandedCards =
    expanded &&
    pages
      .find((p) => p.page === expanded.page)
      ?.pockets.find((k) => k.pocket === expanded.pocket)?.cards;
  // Depth order, front (visible) first — with the optimistic order applied
  // over it while a reorder is saving.
  const orderedExpanded =
    expandedCards && stackOrder
      ? [...expandedCards].sort(
          (a, b) =>
            stackOrder.indexOf(a.placementid) -
            stackOrder.indexOf(b.placementid)
        )
      : expandedCards;

  // Swap a stack card with its neighbour and persist the whole new order —
  // the API takes the full stack, so what is saved is exactly what is shown.
  function moveInStack(index, delta) {
    const ids = orderedExpanded.map((c) => c.placementid);
    const to = index + delta;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    setStackOrder(ids);
    onReorderPocket(expanded.page, expanded.pocket, ids);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCard(null)}
    >
      <Box className="binderLayout">
        <Box className="binderPages">
          <IconButton
            className="pageNav"
            disabled={spread === 0}
            onClick={() => setSpread(spread - 1)}
            title={texts.PREV_PAGES}
          >
            ‹
          </IconButton>
          {visiblePages.map((page, i) =>
            page === null ? (
              // Spread 0: page 1 has nothing facing it, like the inside of the
              // binder's cover.
              <Box className="binderPage pageBlank" key={`blank-${i}`} />
            ) : (
              <Box className="binderPage" key={page.page}>
                <Typography variant="caption" className="binderPageLabel">
                  {texts.PAGE} {page.page}
                </Typography>
                <Box className="binderGrid">
                  {page.pockets.map((pocket) => (
                    <Pocket
                      key={pocket.pocket}
                      page={page.page}
                      pocket={pocket.pocket}
                      cards={pocket.cards}
                      disabled={!arrange}
                      // While the shop holds the binder, opening a pocket is
                      // how a single card gets asked for — so every occupied
                      // pocket opens, not only stacks.
                      expandAny={withdrawable}
                      expanded={
                        expanded?.page === page.page &&
                        expanded?.pocket === pocket.pocket
                      }
                      onExpand={() => {
                        setStackOrder(null);
                        setExpanded({ page: page.page, pocket: pocket.pocket });
                      }}
                      onShift={
                        arrange && onShiftPage
                          ? (direction) =>
                              onShiftPage(page.page, pocket.pocket, direction)
                          : null
                      }
                      onEditVersion={
                        onEditVersion && pocket.cards.length === 1
                          ? () => onEditVersion(pocket.cards[0])
                          : null
                      }
                    />
                  ))}
                </Box>
              </Box>
            )
          )}
          <IconButton
            className="pageNav"
            disabled={atLast && !arrange}
            onClick={turnForward}
            title={atLast ? texts.ADD_PAGE : texts.NEXT_PAGES}
          >
            ›
          </IconButton>
        </Box>

        <StandbyZone cards={standby} disabled={!arrange}>
          {standby.map((card) => (
            <Box key={card.placementid} className="standbyItem">
              <DraggableCard card={card} disabled={!arrange} />
              {/* On the card, not under it: the actions belong to the card and
                  the column stays as tall as the card is. Floated with a glow
                  so they read against whatever artwork is behind them.
                  Lifted cards get them too — a lifted card is still filed in
                  its pocket, but duplicating or removing a copy is about the
                  copy, not the pocket, and both work by placement id. `mutate`
                  still gates them: they change the collection, which
                  arranging alone does not permit. */}
              {mutate && (
                <Box className="standbyActions">
                  {/* Duplicating is how somebody who owns three of a printing
                      files three of them without searching three times. */}
                  <IconButton
                    size="small"
                    title={texts.DUPLICATE_COPY}
                    onClick={() => onDuplicate(card.placementid)}
                  >
                    +
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    title={texts.REMOVE_FROM_CONTAINER}
                    onClick={() => onRemove(card.placementid)}
                  >
                    ×
                  </IconButton>
                </Box>
              )}
            </Box>
          ))}
          {!standby.length && (
            // The children render inside the card grid, whose columns are one
            // card wide — a sentence squeezed into one breaks a word per line.
            // Span the full row instead.
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ gridColumn: "1 / -1" }}
            >
              {texts.STANDBY_EMPTY}
            </Typography>
          )}
        </StandbyZone>
      </Box>

      {/* The card follows the cursor rather than the original moving, so the
          layout underneath stays still while you decide where to drop. No drop
          animation: the default flies the overlay back to where the drag
          started, which reads as the move failing while the reload puts the
          card in its (correct) new pocket. */}
      <DragOverlay dropAnimation={null}>
        {activeCard && (
          <Box className="binderCard dragging">
            {activeCard.image && (
              <Box component="img" src={activeCard.image} alt={activeCard.name} />
            )}
          </Box>
        )}
      </DragOverlay>

      {/* A pocket holds a stack, and only the top of it is visible. Opening it
          is the only way to reach the cards underneath. */}
      <Dialog
        open={Boolean(expanded && expandedCards?.length)}
        onClose={() => setExpanded(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {texts.PAGE} {expanded?.page} · {texts.POCKET} {expanded?.pocket}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {texts.POCKET_EXPAND_HINT} {texts.POCKET_ORDER_HINT}
          </Typography>
          <Stack spacing={1}>
            {(orderedExpanded ?? []).map((card, index) => (
              <Stack
                key={card.placementid}
                direction="row"
                spacing={1.5}
                alignItems="center"
              >
                {card.image && (
                  <Box
                    component="img"
                    src={card.image}
                    alt={card.name}
                    sx={{ width: 40, height: 56, borderRadius: 0.5 }}
                  />
                )}
                <Typography sx={{ flex: 1, fontWeight: 600 }}>
                  {card.name}
                </Typography>
                {/* The front of the stack is the card showing in the pocket;
                    say so instead of leaving the order to be guessed. */}
                {index === 0 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    color="success"
                    label={texts.POCKET_VISIBLE}
                  />
                )}
                {isFoil(card.variant) && (
                  <Chip
                    size="small"
                    color="secondary"
                    label={finishLabel(card.variant)}
                  />
                )}
                <Typography variant="caption" color="text.secondary">
                  {card.cardsetname}
                </Typography>
                {/* The dialog stays open on move: emptying a stack card by
                    card is the point of opening it. It closes itself when the
                    last card leaves (nothing left to show), or via the
                    button. Lifting is on-screen only — the card keeps its
                    pocket until it is dropped somewhere else. */}
                {onEditVersion && (
                  <IconButton
                    size="small"
                    title={texts.CHANGE_VERSION}
                    onClick={() => onEditVersion(card)}
                  >
                    ✎
                  </IconButton>
                )}
                {arrange && onReorderPocket && (
                  <Stack direction="row">
                    <IconButton
                      size="small"
                      disabled={index === 0}
                      title={texts.STACK_UP}
                      onClick={() => moveInStack(index, -1)}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={index === (orderedExpanded?.length ?? 1) - 1}
                      title={texts.STACK_DOWN}
                      onClick={() => moveInStack(index, 1)}
                    >
                      ↓
                    </IconButton>
                  </Stack>
                )}
                {arrange && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => lift(card.placementid)}
                  >
                    {texts.TO_STANDBY}
                  </Button>
                )}
                {/* The binder is on the shop's shelf: the customer cannot take
                    the card out, but they can ask for it back. */}
                {!arrange && withdrawable && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onWithdraw(card.placementid)}
                  >
                    {texts.REQUEST_WITHDRAWAL}
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpanded(null)}>{texts.CLOSE}</Button>
        </DialogActions>
      </Dialog>
    </DndContext>
  );
}
