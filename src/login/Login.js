import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import Header from "../header/Header";
import texts from "../data/texts";
import whiteLoader from "../images/whiteLoader.svg";
import { storeInLS, accessAPI } from "../utils/fetchFunctions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { storeRole } from "../utils/role";

export default function Login() {
  const [loginLoader, setLoginLoader] = useState(true);

  // Variables used for highlighting the field if there's an error
  const [usernameError, setUsernameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const loginUsername = useRef(null);
  const loginPassword = useRef(null);

  let navigate = useNavigate();

  // When the component loads, verify if the user is loaded
  useEffect(() => {
    accessAPI(
      "GET",
      "player/me",
      null,
      (response) => {
        // If the response is 200, means the user is logged in.
        // player/me does not report the role, so ask the shop-side endpoint:
        // it answers only for staff and owner, which is exactly the gate this
        // app needs.
        accessAPI(
          "GET",
          "admin/me",
          null,
          (me) => {
            storeRole(me.role);
            navigate("/home");
          },
          // A customer account is logged in but has no business here.
          () => setLoginLoader(false)
        );
      },
      (response) => {
        // If the user is not logged in, turn off the loader
        setLoginLoader(false);
      }
    );
  }, [navigate]);

  // Function for logging in the user
  function loginUser(e) {
    // Prever navigation for form submit
    e.preventDefault();
    // Verifies that the user enterd their username and password
    if (!loginUsername.current.value) {
      setUsernameError(true);
    }
    if (!loginPassword.current.value) {
      setPasswordError(true);
    }
    var enteredLoginUsername = loginUsername.current.value;
    if (!loginUsername.current.value || !loginPassword.current.value) {
      return false;
    }
    // If there is a username and a password, send it to the API
    setLoginLoader(true);
    accessAPI(
      "POST",
      "oauth",
      JSON.stringify({
        username: loginUsername.current.value,
        password: loginPassword.current.value,
      }),
      (response) => {
        // If the login is successful, store the token in LS and navigate.
        storeInLS(process.env.REACT_APP_LS_LOGIN_TOKEN, response.token);
        // The old code tested `response.superuser === 1` against a boolean, so
        // it never fired, and wrote to REACT_APP_LS_SUPERUSER which was never
        // defined — the value landed under the key "undefined". The API now
        // returns a role and it is stored under a real key.
        storeRole(response.role);
        navigate("/home");
      },
      (response) => {
        setLoginLoader(false);
        loginUsername.current.value = enteredLoginUsername;
        alert(response.message);
      }
    );
  }

  return (
    <div>
      <Header showMenu={false} />
      <div className={loginLoader ? "loginContainer loader" : "loginContainer"}>
        {loginLoader && (
          <div className="loaderContainer">
            <img src={whiteLoader} className="loader" alt="Loading" />
          </div>
        )}
        {!loginLoader && (
          <div className="loginForm">
            <div className="fields">
              <form onSubmit={loginUser}>
                <Stack spacing={2}>
                  {/* inputRef, not ref: TextField is a wrapper, and the code
                      below reads .current.value off the actual input. */}
                  <TextField
                    type="text"
                    placeholder={texts.USER_PLACEHOLDER}
                    error={usernameError}
                    onChange={() => setUsernameError(false)}
                    inputRef={loginUsername}
                    fullWidth
                  />
                  <TextField
                    type="password"
                    placeholder={texts.PASSWORD_PLACEHOLDER}
                    error={passwordError}
                    onChange={() => setPasswordError(false)}
                    inputRef={loginPassword}
                    fullWidth
                  />
                  <Button className="login" type="submit" fullWidth>
                    {texts.ENTER}
                  </Button>
                </Stack>
              </form>
            </div>
            <Button variant="text" className="forgot">
              {texts.FORGOT_PASSWORD}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
