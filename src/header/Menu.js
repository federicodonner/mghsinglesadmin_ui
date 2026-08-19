import React from "react";
import "./menu.css";
import { NavLink, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import texts from "../data/texts";
import { logout } from "../utils/fetchFunctions";
import { readRole, clearRole, isOwner } from "../utils/role";

// The routes in the bar, in order. `ownerOnly` marks the ones a shop hand does
// not get. Keeping them as data rather than a dozen near-identical JSX blocks
// is what stops one of them quietly drifting out of step with the others.
const LINKS = [
  { to: "/sell", label: texts.SELL_CARDS },
  { to: "/orders", label: texts.ORDERS },
  { to: "/storage", label: texts.STORAGE },
  { to: "/pricing", label: texts.PRICING, ownerOnly: true },
  { to: "/payment", label: texts.PAYMENT, ownerOnly: true },
  { to: "/users", label: texts.USERS, ownerOnly: true },
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

  // Hiding a menu item is a courtesy, not a control: every owner-only route is
  // gated server-side, so a staff member who types the URL gets a 403 either
  // way. This just stops the app offering doors that will not open.
  const owner = isOwner(readRole());

  if (!props.loggedIn) {
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

  return (
    <Stack
      direction="row"
      alignItems="center"
      className="menuContainer"
      spacing={0.5}
    >
      {LINKS.filter((link) => owner || !link.ownerOnly).map((link) => (
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
        onClick={() => {
          logout();
          clearRole();
          navigate("/login");
        }}
      >
        {texts.LOGOUT}
      </Button>
    </Stack>
  );
}
