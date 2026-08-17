import React from "react";
import "./menu.css";
import { NavLink, useNavigate } from "react-router-dom";
import texts from "../data/texts";
import { logout } from "../utils/fetchFunctions";
import { readRole, clearRole, isOwner } from "../utils/role";

export default function Menu(props) {
  const navigate = useNavigate();

  // Hiding a menu item is a courtesy, not a control: every owner-only route is
  // gated server-side, so a staff member who types the URL gets a 403 either
  // way. This just stops the app offering doors that will not open.
  const owner = isOwner(readRole());

  return (
    <>
      {props.loggedIn && (
        <div className="menuContainer">
          <NavLink
            to="/sell"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.SELL_CARDS}</div>
          </NavLink>
          <NavLink
            to="/orders"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.ORDERS}</div>
          </NavLink>
          <NavLink
            to="/find"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.FIND}</div>
          </NavLink>
          <NavLink
            to="/storage"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.STORAGE}</div>
          </NavLink>
          {owner && (
          <NavLink
            to="/pricing"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.PRICING}</div>
          </NavLink>
          )}
          {owner && (
          <NavLink
            to="/payment"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.PAYMENT}</div>
          </NavLink>
          )}
          {owner && (
            <NavLink
              to="/users"
              className={(navData) =>
                navData.isActive ? "selectedButton menuElement" : "menuElement"
              }
            >
              <div className="label">{texts.USERS}</div>
            </NavLink>
          )}
          <NavLink
            to="/account"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.MY_ACCOUNT}</div>
          </NavLink>
          <div className="menuElement logoutButton">
            <div
              onClick={() => {
                logout();
                clearRole();
                navigate("/login");
              }}
            >
              {texts.LOGOUT}
            </div>
          </div>
        </div>
      )}
      {!props.loggedIn && (
        <div className="menuContainer">
          <div className="separator"></div>
          <div className="separator"></div>
          <div className="separator"></div>
          <NavLink to="/login" className="menuElement">
            <div className="label">{texts.LOGIN}</div>
          </NavLink>
        </div>
      )}
    </>
  );
}
