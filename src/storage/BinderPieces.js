import React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import texts from "../data/texts";

// The draggable pieces of the binder editor.
//
// Kept apart from the page that composes them because dnd-kit wants a hook per
// draggable and per drop target, and mixing nine pockets' worth of hooks into
// the page component made it impossible to read.

// One card, as a small piece of art you can pick up.
//
// The whole tile is the drag handle: a card in a binder is a thing you grab,
// and a separate grip would be a control to learn for no gain. No tooltip —
// the artwork already says which card this is, and a label popping up under
// the cursor got in the way of dragging.
export function DraggableCard({ card, disabled, onClick, dimmed }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card-${card.placementid}`,
    data: { placementid: card.placementid, cardid: card.cardid },
    disabled,
  });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className="binderCard"
      sx={{
        // The dragged original fades rather than disappearing, so the pocket
        // does not visibly collapse and reflow under the cursor.
        opacity: isDragging ? 0.35 : dimmed ? 0.55 : 1,
        cursor: disabled ? "default" : "grab",
        touchAction: "none",
      }}
    >
      {card.image ? (
        <Box component="img" src={card.image} alt={card.name} loading="lazy" />
      ) : (
        <Box className="binderCardNoArt">
          <Typography variant="caption">{card.name}</Typography>
        </Box>
      )}
    </Box>
  );
}

// One of the nine slots on a page.
//
// A pocket holds a stack, so it shows the top card with a count when there is
// more than one. Clicking opens the stack — otherwise the cards underneath
// could never be reached, which is the whole reason a pocket holds several.
export function Pocket({
  page,
  pocket,
  cards,
  disabled,
  expandAny,
  onExpand,
  expanded,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pocket-${page}-${pocket}`,
    data: { page, pocket },
    disabled,
  });

  const top = cards[0];
  // Stacks always open (the cards underneath are unreachable otherwise);
  // `expandAny` opens single-card pockets too, for when opening the pocket is
  // itself the action — asking for a card back from a held binder.
  const canExpand =
    Boolean(onExpand) &&
    (cards.length > 1 || (expandAny && cards.length > 0));

  return (
    <Box
      ref={setNodeRef}
      className={`binderPocket${isOver ? " over" : ""}${
        expanded ? " expanded" : ""
      }`}
      onClick={canExpand ? onExpand : undefined}
      sx={{ cursor: canExpand ? "pointer" : "default" }}
    >
      {top ? (
        <>
          <DraggableCard card={top} disabled={disabled || cards.length > 1} />
          {cards.length > 1 && (
            <Box className="pocketCount" title={texts.POCKET_STACK}>
              {cards.length}
            </Box>
          )}
        </>
      ) : (
        <Box className="pocketEmpty">{pocket}</Box>
      )}
    </Box>
  );
}

// The area beside the pages where cards wait.
//
// A real place, not a UI trick: these are placements with no page and no
// pocket, so a half-finished sort is still there tomorrow. It is also a drop
// target, which is how a card gets lifted out of a pocket in the first place.
export function StandbyZone({ cards, disabled, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: "standby", disabled });

  return (
    <Box
      ref={setNodeRef}
      className={`standbyZone${isOver ? " over" : ""}`}
    >
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {texts.STANDBY_TITLE}
        {cards.length > 0 && ` (${cards.length})`}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        {texts.STANDBY_HINT}
      </Typography>
      <Box className="standbyCards">{children}</Box>
    </Box>
  );
}
