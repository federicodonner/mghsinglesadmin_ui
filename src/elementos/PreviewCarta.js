import React, { useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import texts from "../data/texts";
import "./previewCarta.css";

// A card image, anywhere on the platform, that can be seen properly.
//
// Card art in lists and sidebars is thumbnail-sized, and telling two
// printings apart at 32 pixels wide is guesswork. Hovering any card shows a
// magnifier; clicking it opens the image at readable size in a popup that
// closes on any click.
//
// Layout stays the caller's: `sx` and `className` land on the <img> exactly
// as they did before this component existed, and the wrapper hugs the image.
// Two shapes for the magnifier:
//
//   default — a small button in the lower-left corner of the art, for
//             previews big enough to keep it out of the way.
//   `small` — the button IS the card: on thumbnails there is no corner to
//             tuck into, so hovering veils the whole image and centres the
//             magnifier on it.
//   `fill`  — the wrapper takes its parent's full size, for images that CSS
//             sizes through their container (width/height 100%).
//
// The magnifier and the popup both swallow their clicks: many previews live
// inside rows and tiles that select or navigate on click, and zooming must
// not also trigger that.
//
// NOT used by the binder editor's pockets and stand-by area — those tiles
// are drag handles with hover controls of their own, and a magnifier there
// would fight both.
export default function PreviewCarta({ image, name, className, sx, small, fill }) {
  const [open, setOpen] = useState(false);

  if (!image) return null;

  return (
    <>
      <Box
        className={`previewCarta${small ? " previewCartaSmall" : ""}${
          fill ? " previewCartaFill" : ""
        }`}
      >
        <Box
          component="img"
          src={image}
          alt={name}
          loading="lazy"
          className={className}
          sx={sx}
        />
        <IconButton
          className="previewCartaZoom"
          size="small"
          title={texts.ZOOM_CARD}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {/* Sized by the CSS: bigger in the corner shape, modest when it
              veils a thumbnail. */}
          <ZoomInIcon />
        </IconButton>
      </Box>
      {/* The popup is rendered through a portal but still bubbles clicks up
          the React tree — into whatever row or tile the preview sits in — so
          every click inside it stops here, and also closes: the popup is for
          looking, and anywhere is the way out. */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
        }}
        maxWidth={false}
        // Above the side forms (which sit above dialogs): a card inside the
        // add-card sidebar zooms too, and the popup must not open behind it.
        sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
        slotProps={{
          paper: {
            sx: {
              background: "transparent",
              boxShadow: "none",
              overflow: "visible",
              m: 2,
            },
          },
        }}
      >
        <Box
          component="img"
          src={image}
          alt={name}
          sx={{
            width: "min(88vw, 440px)",
            maxHeight: "88vh",
            objectFit: "contain",
            // Match the physical card's corner rounding at this size.
            borderRadius: "4.75% / 3.4%",
          }}
        />
      </Dialog>
    </>
  );
}
