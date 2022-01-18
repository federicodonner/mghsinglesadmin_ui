import React, { useState, useEffect } from "react";
import "./menu.css";
import { NavLink, useNavigate } from "react-router-dom";
import texts from "../data/texts";
import { logout, readFromLS } from "../utils/fetchFunctions";

export default function Menu(props) {
  const [isSuperuser, setIsSuperuser] = useState(false);
  const navigate = useNavigate();

  // On render, verifies that the user is a superuser
  useEffect(() => {
    setIsSuperuser(readFromLS(process.env.REACT_APP_LS_SUPERUSER));
  }, []);

  return (
    <>
      {props.loggedIn && (
        <div className="menuContainer">
          <NavLink
            to="/collection"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.MY_COLLECTION}</div>
          </NavLink>
          <NavLink
            to="/sales"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.MY_SALES}</div>
          </NavLink>
          <NavLink
            to="/account"
            className={(navData) =>
              navData.isActive ? "selectedButton menuElement" : "menuElement"
            }
          >
            <div className="label">{texts.MY_ACCOUNT}</div>
          </NavLink>
          {isSuperuser && (
            <>
              <NavLink
                to="/sell"
                className={(navData) =>
                  navData.isActive
                    ? "selectedButton menuElement"
                    : "menuElement"
                }
              >
                <div className="label">{texts.SELL_CARDS}</div>
              </NavLink>
              <NavLink
                to="/payment"
                className={(navData) =>
                  navData.isActive
                    ? "selectedButton menuElement"
                    : "menuElement"
                }
              >
                <div className="label">{texts.PAYMENT}</div>
              </NavLink>
            </>
          )}
          <div className="menuElement logoutButton">
            <div
              onClick={() => {
                logout();
                navigate("/");
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
