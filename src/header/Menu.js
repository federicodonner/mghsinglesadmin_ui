import React, { useState } from "react";
import "./menu.css";
import { NavLink, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import Stack from "@mui/material/Stack";
import useMediaQuery from "@mui/material/useMediaQuery";
import texts from "../data/texts";
import { logout, readFromLS } from "../utils/fetchFunctions";
import { readRole, clearRole, isOwner } from "../utils/role";

// The routes in the bar, in order. `ownerOnly` marks the ones a shop hand does
// not get. Keeping them as data rather than a dozen near-identical JSX blocks
// is what stops one of them quietly drifting out of step with the others.
// staff and owner both do everything now (2026-09-02, Federico), so nothing is
// ownerOnly. The `visible` filter and role plumbing stay in place so specific
// items can be re-restricted later by marking them `ownerOnly: true` again.
const LINKS = [
  { to: "/sell", label: texts.SELL_CARDS },
  { to: "/orders", label: texts.ORDERS },
  { to: "/storage", label: texts.STORAGE },
  { to: "/pricing", label: texts.PRICING },
  { to: "/payment", label: texts.PAYMENT },
  { to: "/users", label: texts.USERS },
  { to: "/account", label: texts.MY_ACCOUNT },
];

// One shared look for every item in the bar: white text on the brand strip,
// bold when it is the page you are on.
const itemSx = {
  color: "#fff",
  fontWeight: 400,
  px: 1.5,
  minWidth: "auto",
  "&:hover": { backgroundColor: "rgba(255,255,255,0.14)" },
  "&.active": { fontWeight: 700 },
};

export default function Menu(props) {
  const navigate = useNavigate();

  // Pages report loggedIn only after the session check answers, which left
  // the bar showing "Ingresar" for a beat on every navigation. A stored token
  // is a session until the server says otherwise (a 401 logs out and brings
  // us back here without one), so trust it optimistically.
  const loggedIn =
    props.loggedIn || Boolean(readFromLS(process.env.REACT_APP_LS_LOGIN_TOKEN));

  // Hiding a menu item is a courtesy, not a control: every owner-only route is
  // gated server-side, so a staff member who types the URL gets a 403 either
  // way. This just stops the app offering doors that will not open.
  const owner = isOwner(readRole());

  // The single compact-layout breakpoint, shared with header.css: below it
  // the bar becomes a burger AND the header sheds the partner logo — the two
  // must flip together.
  const narrow = useMediaQuery("(max-width:800px)");
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!loggedIn) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        className="menuContainer"
      >
        <Button
          component={NavLink}
          to="/login"
          variant="text"
          disableRipple
          sx={itemSx}
        >
          {texts.LOGIN}
        </Button>
      </Stack>
    );
  }

  const visible = LINKS.filter((link) => owner || !link.ownerOnly);

  function doLogout() {
    logout();
    clearRole();
    navigate("/login");
  }

  if (narrow) {
    return (
      <>
        <IconButton
          aria-label={texts.MENU}
          onClick={() => setDrawerOpen(true)}
          sx={{ color: "#fff", ml: "auto" }}
        >
          <MenuIcon />
        </IconButton>
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <List sx={{ width: 230, pt: 2 }}>
            {visible.map((link) => (
              <ListItemButton
                key={link.to}
                component={NavLink}
                to={link.to}
                onClick={() => setDrawerOpen(false)}
                sx={{ "&.active .MuiListItemText-primary": { fontWeight: 700 } }}
              >
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
            <Divider sx={{ my: 1 }} />
            <ListItemButton onClick={doLogout}>
              <ListItemText primary={texts.LOGOUT} />
            </ListItemButton>
          </List>
        </Drawer>
      </>
    );
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      className="menuContainer"
      spacing={0.5}
    >
      {visible.map((link) => (
        <Button
          key={link.to}
          component={NavLink}
          to={link.to}
          variant="text"
          disableRipple
          sx={itemSx}
        >
          <span className="label">{link.label}</span>
        </Button>
      ))}
      <Button
        variant="text"
        disableRipple
        className="logoutButton"
        sx={itemSx}
        onClick={doLogout}
      >
        {texts.LOGOUT}
      </Button>
    </Stack>
  );
}
