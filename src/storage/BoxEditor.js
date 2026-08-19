import React from "react";
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
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import texts from "../data/texts";
import { isFoil, finishLabel } from "../utils/finishes";
import "./binder.css";

// One row of a box.
function Row({ card, sortable, mutate, withdrawable, onRemove, onWithdraw, position }) {
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
      {card.image && (
        <Box
          component="img"
          src={card.image}
          alt={card.name}
          loading="lazy"
          sx={{ width: 38, height: 53, borderRadius: 0.5, flex: "0 0 auto" }}
        />
      )}
      <Typography sx={{ fontWeight: 600, flex: "1 1 160px", minWidth: 0 }}>
        {card.name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {card.cardsetname}
      </Typography>
      <Chip size="small" label={card.condition} />
      <Chip size="small" variant="outlined" label={card.language} />
      {isFoil(card.variant) && (
        <Chip size="small" color="secondary" label={finishLabel(card.variant)} />
      )}
      {mutate && (
        <Button
          size="small"
          variant="outlined"
          color="error"
          sx={{ ml: "auto" }}
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
  onRemove,
  onReorder,
  onWithdraw,
}) {
  const sortable = unit.type === "sorted_box" && arrange;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const cards =
    unit.type === "sorted_box"
      ? unit.cards ?? []
      : (unit.cards ?? [])
          .slice()
          .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = cards.findIndex((c) => c.placementid === active.id);
    const to = cards.findIndex((c) => c.placementid === over.id);
    if (from < 0 || to < 0) return;
    // The whole new order goes to the API, not "move item 3 to 7" — the result
    // is then exactly what is on screen.
    onReorder(arrayMove(cards, from, to).map((c) => c.placementid));
  }

  const list = (
    <Stack spacing={0.75}>
      {cards.map((card, index) => (
        <Row
          key={card.placementid}
          card={card}
          sortable={sortable}
          mutate={mutate}
          withdrawable={withdrawable}
          onRemove={onRemove}
          onWithdraw={onWithdraw}
          position={unit.type === "sorted_box" ? index + 1 : null}
        />
      ))}
    </Stack>
  );

  if (!sortable) return list;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={cards.map((c) => c.placementid)}
        strategy={verticalListSortingStrategy}
      >
        {list}
      </SortableContext>
    </DndContext>
  );
}
