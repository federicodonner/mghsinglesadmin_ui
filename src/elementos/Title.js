import React from "react";
import { Link } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import texts from "../data/texts";

// The heading of a page: back arrow, title, optional subtitle, and the page's
// metadata as a uniform row of chips.
//
// One component so every page's header carries the same shapes — the storage
// pages had grown a mix of buttons, bare text and one lone chip, all saying
// "metadata" in a different voice.
//
// `tags` entries are strings, or { label, color } when one deserves a color
// (e.g. a for-sale state in green).
//
// `buttons` entries are { label, onClick } — or { label, to } for one that
// navigates — plus optional variant/color passthrough. They land on the right
// edge, as do any children, for anything a descriptor cannot say.
export default function Title({
  title,
  subtitle,
  tags = [],
  buttons = [],
  onBack,
  children,
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      sx={{ mb: 2 }}
    >
      {onBack && (
        <IconButton
          onClick={onBack}
          aria-label={texts.BACK}
          className="titleBack"
        >
          <ArrowBackIcon />
        </IconButton>
      )}
      <Box>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <Typography variant="h6" component="h1">
            {title}
          </Typography>
          {tags.map((tag) => {
            const t = typeof tag === "string" ? { label: tag } : tag;
            return (
              <Chip
                key={t.label}
                size="small"
                variant={t.color ? "filled" : "outlined"}
                color={t.color}
                label={t.label}
              />
            );
          })}
        </Stack>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {(buttons.length > 0 || children) && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: "auto" }}>
          {buttons.map((button) => (
            <Button
              key={button.label}
              size="small"
              variant={button.variant}
              color={button.color}
              onClick={button.onClick}
              component={button.to ? Link : undefined}
              to={button.to}
            >
              {button.label}
            </Button>
          ))}
          {children}
        </Stack>
      )}
    </Stack>
  );
}
