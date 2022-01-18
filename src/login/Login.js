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

  const [createUsernameError, setCreateUsernameError] = useState(false);
  const [createNameError, setCreateNameError] = useState(false);
  const [createEmailError, setCreateEmailError] = useState(false);
  const [createPasswordError, setCreatePasswordError] = useState(false);

  const [creatingAccount, setCreatingAccount] = useState(false);

  const loginUsername = useRef(null);
  const loginPassword = useRef(null);
  const createUsername = useRef(null);
  const createName = useRef(null);
  const createEmail = useRef(null);
  const createPassword = useRef(null);

  let navigate = useNavigate();

  // When the component loads, verify if the user is loaded
  useEffect(() => {
    accessAPI(
      "GET",
      "user/me",
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

  function createUser(e) {
    // Prevent navigation on form submit
    e.preventDefault();

    // Verifies that the user enterd the information
    if (!createUsername.current.value) {
      setCreateUsernameError(true);
    }
    if (!createName.current.value) {
      setCreateNameError(true);
    }
    if (!createEmail.current.value) {
      setCreateEmailError(true);
    }
    if (!createPassword.current.value) {
      setCreatePasswordError(true);
    }

    if (
      !createUsername.current.value ||
      !createName.current.value ||
      !createEmail.current.value ||
      !createPassword.current.value
    ) {
      return false;
    }
    // If there is a username and a password, send it to the API
    var createUsernameData = createUsername.current.value;
    var createNameData = createName.current.value;
    var createEmailData = createEmail.current.value;
    setLoginLoader(true);
    accessAPI(
      "POST",
      "user",
      JSON.stringify({
        username: createUsernameData,
        name: createNameData,
        email: createEmailData,
        password: createPassword.current.value,
      }),
      (response) => {
        // If the login is successful, store the token in LS and navigate
        storeInLS(process.env.REACT_APP_LS_LOGIN_TOKEN, response.token);
        navigate("/home");
      },
      (response) => {
        setLoginLoader(false);
        // Restores the data entered
        createUsername.current.value = createUsernameData;
        createName.current.value = createNameData;
        createEmail.current.value = createEmailData;
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
        {!loginLoader && !creatingAccount && (
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
            <div className="textButton light">{texts.FORGOT_PASSWORD}</div>
            <div className="divider light"></div>
            <button
              className="light create"
              onClick={() => {
                setCreatingAccount(true);
              }}
            >
              {texts.CREATE_ACCOUNT}
            </button>
          </div>
        )}
        {!loginLoader && creatingAccount && (
          <div className="loginForm">
            <div className="fields">
              <form onSubmit={createUser}>
                <input
                  type="text"
                  placeholder={texts.CREATE_USERNAME}
                  className={createUsernameError ? "error" : ""}
                  onChange={() => {
                    setCreateUsernameError(false);
                  }}
                  ref={createUsername}
                />
                <input
                  type="text"
                  placeholder={texts.CREATE_NAME}
                  className={createNameError ? "error" : ""}
                  onChange={() => {
                    setCreateNameError(false);
                  }}
                  ref={createName}
                />
                <input
                  type="text"
                  placeholder={texts.CREATE_EMAIL}
                  className={createEmailError ? "error" : ""}
                  onChange={() => {
                    setCreateEmailError(false);
                  }}
                  ref={createEmail}
                />
                <input
                  type="password"
                  placeholder={texts.CREATE_PASSWORD}
                  className={createPasswordError ? "error" : ""}
                  onChange={() => {
                    setCreatePasswordError(false);
                  }}
                  ref={createPassword}
                />
                <button className="light register" type="submit">
                  {texts.CREATE_ACCOUNT}
                </button>{" "}
              </form>
              <button
                className="light register"
                onClick={() => {
                  setCreatingAccount(false);
                }}
              >
                {texts.CANCEL}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
