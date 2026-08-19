import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// A form that slides in from the right edge, instead of sitting permanently in
// the page. The page stays about its content; the form appears when asked for
// and takes the whole viewport height while it is.
//
// This only provides the surface — title bar, close affordance, consistent
// width and padding. Whatever form it is goes in as children, so every sidebar
// form in the app opens and closes the same way.
export default function SideForm({ open, onClose, title, children }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "85vw", sm: 360 }, px: 3, pt: 5, pb: 3 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 4 }}
        >
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          <IconButton onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Stack>
        {children}
      </Box>
    </Drawer>
  );
}
