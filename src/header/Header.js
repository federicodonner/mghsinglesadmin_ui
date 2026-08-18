import { Link } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import "./header.css";
import Menu from "./Menu";
import singlesLogo from "../images/mghsinglesLogo.png";
import mghlogo from "../images/mghLogo.png";

// The site header: brand, nav, co-brand.
//
// This used to be a 900px-wide <header> with a separately positioned 30px
// colour strip absolutely placed behind it, and the nav items nudged into that
// strip with fixed margins. Two problems: the bar stopped short of the page
// content, which is what the width complaint was about, and the alignment only
// held while every nav item happened to be exactly 25px tall.
//
// It is a stock AppBar + Toolbar now. The coloured band is the AppBar itself,
// so nothing has to be positioned into it, and the inner Box is capped at the
// same --page-width every page container uses.
export default function Header(props) {
  return (
    <AppBar
      position="static"
      elevation={0}
      color="primary"
      className="siteHeader"
    >
      <Box className="headerInner">
        <Toolbar disableGutters sx={{ gap: 2, minHeight: { xs: 64 } }}>
          <Link to="/" className="logoContainer">
            <img src={singlesLogo} className="singlesLogo" alt="MGH Singles" />
          </Link>

          {props.showMenu && (
            <Menu
              loggedIn={props.loggedIn}
              logOutHideMenu={props.logOutHideMenu}
            />
          )}

          <Box className="mghlogoContainer" sx={{ ml: "auto" }}>
            <span className="by">by</span>
            <img src={mghlogo} className="mghlogo" alt="MGH" />
          </Box>
        </Toolbar>
      </Box>
    </AppBar>
  );
}
