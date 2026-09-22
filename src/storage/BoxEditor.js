import React, { useState, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import texts from "../data/texts";
import PreviewCarta from "../elementos/PreviewCarta";
import { isFoil, finishLabel } from "../utils/finishes";
import "./binder.css";

// A box holds hundreds of copies, and a single endless list makes the page
// heavy and the scrollbar useless. Ten rows fit on a screen without
// scrolling, so the pager is the only thing to reach for.
const PAGE_SIZE = 10;

// One row of a box.
function Row({ card, sortable, mutate, withdrawable, onDuplicate, onRemove, onWithdraw, onEditVersion, position }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.placementid, disabled: !sortable });

  return (
    <Stack
      ref={setNodeRef}
      direction="row"
      spacing={1.5}
      alignItems="center"
      className="boxRow"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {/* Only a sorted box gets a handle — dragging a row in an unsorted box
          would promise an order it does not keep. */}
      {sortable && (
        <Box
          className="dragHandle"
          {...listeners}
          {...attributes}
          title={texts.DRAG_TO_REORDER}
        >
          ⠿
        </Box>
      )}
      {position != null && (
        <Typography variant="caption" color="text.secondary" sx={{ width: 28 }}>
          #{position}
        </Typography>
      )}
      <PreviewCarta
        image={card.image}
        name={card.name}
        small
        sx={{ width: 38, height: 53, borderRadius: 0.5 }}
      />
      <Typography sx={{ fontWeight: 600, flex: "1 1 160px", minWidth: 0 }}>
        {card.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {card.cardsetname}
      </Typography>
      {isFoil(card.variant) && (
        <Chip size="small" color="secondary" label={finishLabel(card.variant)} />
      )}
      {/* Another copy of the same printing: next to this one in a sorted
          box, simply in the box when nothing has a place. */}
      {mutate && onDuplicate && (
        <Button
          size="small"
          variant="outlined"
          sx={{ ml: "auto" }}
          onClick={() => onDuplicate(card.placementid)}
        >
          {texts.DUPLICATE_COPY}
        </Button>
      )}
      {mutate && onEditVersion && (
        <Button
          size="small"
          variant="outlined"
          sx={{ ml: onDuplicate ? 0 : "auto" }}
          onClick={() => onEditVersion(card)}
        >
          {texts.CHANGE_VERSION}
        </Button>
      )}
      {mutate && (
        <Button
          size="small"
          variant="outlined"
          color="error"
          sx={{ ml: onDuplicate || onEditVersion ? 0 : "auto" }}
          onClick={() => onRemove(card.placementid)}
        >
          {texts.REMOVE_FROM_CONTAINER}
        </Button>
      )}
      {/* The box is on the shop's shelf, so the customer cannot take the card
          out — but they can ask for it, and the shop's queue does the rest. */}
      {!mutate && withdrawable && (
        <Button
          size="small"
          variant="outlined"
          sx={{ ml: "auto" }}
          onClick={() => onWithdraw(card.placementid)}
        >
          {texts.REQUEST_WITHDRAWAL}
        </Button>
      )}
    </Stack>
  );
}

// A box, as a list.
//
// A sorted box keeps an order the customer sets, so its rows can be dragged and
// the result is saved as the sequence. An unsorted box has no order to keep, so
// it is listed alphabetically — which is the only arrangement that helps when
// nothing is in any particular place.
// `arrange` reorders (whoever holds the box); `mutate` removes copies (only
// the owner of the cards).
export default function BoxEditor({
  unit,
  arrange,
  mutate,
  withdrawable,
  onDuplicate,
  onRemove,
  onReorder,
  onWithdraw,
  onEditVersion,
}) {
  const sortable = unit.type === "sorted_box" && arrange;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // The order on screen, owned locally so a drop lands INSTANTLY: rendering
  // straight from the prop meant the old order held until the server
  // round-trip finished, and dnd-kit visibly animated the row back and then
  // forward again. The prop resyncs this whenever the parent reloads, which
  // also puts the truth back if a save ever fails.
  const [ordered, setOrdered] = useState(unit.cards ?? []);
  useEffect(() => {
    setOrdered(unit.cards ?? []);
  }, [unit.cards]);

  const cards =
    unit.type === "sorted_box"
      ? ordered
      : (unit.cards ?? [])
          .slice()
          .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  // Clamped rather than reset: removing the last card of the last page must
  // land on the (new) last page, not jump back to the first.
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const curPage = Math.min(page, pageCount);
  const offset = (curPage - 1) * PAGE_SIZE;
  const visible = cards.slice(offset, offset + PAGE_SIZE);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = cards.findIndex((c) => c.placementid === active.id);
    const to = cards.findIndex((c) => c.placementid === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(cards, from, to);
    // Screen first, server second: the row must already sit where it was
    // dropped when the drop animation runs.
    setOrdered(next);
    // The whole new order goes to the API, not "move item 3 to 7" — the result
    // is then exactly what is on screen.
    onReorder(next.map((c) => c.placementid));
  }

  const list = (
    <Stack spacing={0.75}>
      {visible.map((card, index) => (
        <Row
          key={card.placementid}
          card={card}
          sortable={sortable}
          mutate={mutate}
          withdrawable={withdrawable}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onWithdraw={onWithdraw}
          onEditVersion={onEditVersion}
          position={unit.type === "sorted_box" ? offset + index + 1 : null}
        />
      ))}
    </Stack>
  );

  const pager = pageCount > 1 && (
    <Pagination
      count={pageCount}
      page={curPage}
      onChange={(e, next) => setPage(next)}
      sx={{ display: "flex", justifyContent: "center", my: 1.5 }}
    />
  );

  if (!sortable) {
    return (
      <>
        {list}
        {pager}
      </>
    );
  }

  // Dragging reorders within the visible page (the drop targets are the rows
  // on screen), but the order saved is always the WHOLE box: the moved row is
  // spliced into the full list, so positions on other pages shift correctly.
  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visible.map((c) => c.placementid)}
          strategy={verticalListSortingStrategy}
        >
          {list}
        </SortableContext>
      </DndContext>
      {pager}
    </>
  );
}
