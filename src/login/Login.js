import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import Header from "../header/Header";
import texts from "../data/texts";
import whiteLoader from "../images/whiteLoader.svg";
import { storeInLS, accessAPI } from "../utils/fetchFunctions";

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
        // If the response is 200, means the user is logged in
        // If the user is a superuser, store it in LS
        if (response.superuser) {
          storeInLS(process.env.REACT_APP_LS_SUPERUSER, "1");
        }
        // Navigate to home
        navigate("/home");
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
        // If the login is successful, store the token in LS and navigate
        storeInLS(process.env.REACT_APP_LS_LOGIN_TOKEN, response.token);
        // If the user is a superuser, store it in LS
        if (response.superuser === 1) {
          storeInLS(process.env.REACT_APP_LS_SUPERUSER, "1");
        }
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
                <input
                  type="text"
                  placeholder={texts.USER_PLACEHOLDER}
                  className={usernameError ? "error" : ""}
                  onChange={() => {
                    setUsernameError(false);
                  }}
                  ref={loginUsername}
                />
                <input
                  type="password"
                  placeholder={texts.PASSWORD_PLACEHOLDER}
                  className={passwordError ? "error" : ""}
                  onChange={() => {
                    setPasswordError(false);
                  }}
                  ref={loginPassword}
                />

                <button className="light login" type="submit">
                  {texts.ENTER}
                </button>
              </form>
            </div>
            <div className="textButton white">{texts.FORGOT_PASSWORD}</div>
          </div>
        )}
      </div>
    </div>
  );
}
