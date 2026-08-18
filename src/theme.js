import { createTheme } from "@mui/material/styles";

// The admin app's MUI theme.
//
// Every interactive element in this app is a MUI component, and the ones that
// used to be hand-styled `<button className="dark">` / `.light` / `.small` now
// get their look from here instead. That is the point of centralising it: a
// button's colour and shape are a decision made once, not re-decided in
// seventeen CSS files that had drifted apart.
//
// The palette is the existing brand, not MUI's defaults: teal leads behind the
// counter, orange on the storefront (see the matching file there). Keeping the
// two files parallel rather than shared is deliberate — they are separate
// deployables with separate package.json files, and a shared module would mean
// a build-time dependency between two apps that otherwise have none.
export const BRAND = {
  orange: "#f16e31",
  orangeDark: "#d85c22",
  teal: "#33586b",
  tealDark: "#284656",
};

const theme = createTheme({
  palette: {
    primary: { main: BRAND.teal, dark: BRAND.tealDark, contrastText: "#fff" },
    secondary: { main: BRAND.orange, dark: BRAND.orangeDark, contrastText: "#fff" },
    error: { main: "#c0392b" },
    background: { default: "#fff" },
    text: { primary: "#333", secondary: "#666" },
  },

  typography: {
    // Matches the face index.css already sets, so switching to MUI does not
    // change the typeface underneath the app.
    fontFamily: '"Open Sans", sans-serif',
    button: {
      // MUI shouts by default. The rest of this app does not.
      textTransform: "none",
      fontWeight: 600,
    },
  },

  shape: { borderRadius: 6 },

  components: {
    MuiButton: {
      defaultProps: { variant: "contained", disableElevation: true },
      styleOverrides: {
        root: { whiteSpace: "nowrap" },
        sizeSmall: { padding: "4px 12px", fontSize: "0.85rem" },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
    },
    MuiSelect: {
      defaultProps: { size: "small" },
    },
    MuiFormControl: {
      defaultProps: { size: "small" },
    },
    MuiLink: {
      defaultProps: { underline: "hover" },
      styleOverrides: {
        root: { color: BRAND.teal, fontWeight: 600, cursor: "pointer" },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
  },
});

export default theme;
