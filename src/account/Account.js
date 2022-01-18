import React, { useState, useEffect, useRef } from "react";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import "./account.css";
import { accessAPI, logout } from "../utils/fetchFunctions";
import texts from "../data/texts";
import whiteLoader from "../images/whiteLoader.svg";

export default function Account() {
  const [loader, setLoader] = useState(true);
  const [userDetails, setUserDetails] = useState(null);

  const [updateDetailsLoader, setUpdateDetailsLoader] = useState(false);
  const [updatePasswordLoader, setUpdatePasswordLoader] = useState(false);

  const newNameRef = useRef(null);
  const newEmailRef = useRef(null);
  const passwordRef = useRef(null);
  const newPasswordRef = useRef(null);

  const navigate = useNavigate();

  // On load, fetch user data
  useEffect(() => {
    accessAPI(
      "GET",
      "user/me",
      null,
      (response) => {
        setUserDetails(response);
        setLoader(false);
      },
      (response) => {
        // If there is a problem with the user, sign them out and navigate to login
        alert(response.message);
        logout();
        navigate("/login");
      }
    );
  }, []);

  // Update name and email
  function updateDetails() {
    // If there is nothing in the form, no
    if (!newNameRef.current.value && !newEmailRef.current.value) {
      return false;
    }

    // Prepare the data
    var data = {};
    if (newNameRef.current.value) {
      data.name = newNameRef.current.value;
    }

    if (newEmailRef.current.value) {
      data.email = newEmailRef.current.value;
    }

    setUpdateDetailsLoader(true);
    accessAPI(
      "PUT",
      "user",
      JSON.stringify(data),
      (response) => {
        setUserDetails(response);
        newNameRef.current.value = null;
        newEmailRef.current.value = null;
        setUpdateDetailsLoader(false);
      },
      (response) => {
        alert(response.message);
        logout();
        navigate("/login");
      }
    );
  }

  // Update password
  function updatePassword() {
    // If there is nothing in the form, no
    if (!passwordRef.current.value || !newPasswordRef.current.value) {
      return false;
    }

    setUpdatePasswordLoader(true);
    accessAPI(
      "PUT",
      "user/password",
      JSON.stringify({
        password: passwordRef.current.value,
        newPassword: newPasswordRef.current.value,
      }),
      (response) => {
        passwordRef.current.value = null;
        newPasswordRef.current.value = null;
        setUpdatePasswordLoader(false);
        alert(response.message);
      },
      (response) => {
        // There are two reasons to fail the response
        // The enterd password is incorrect or the token is not valid
        // If the status is 400 is because the password is incorrect
        alert(response.message);
        setUpdatePasswordLoader(false);
        if (response.status !== 400) {
          logout();
          navigate("/login");
        }
      }
    );
  }
  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      <div className="content">
        {loader && <Loader />}
        {!loader && (
          <>
            <div className="moneyAndStats">Stats</div>
            <div className="editDetails">
              <div className="title">{texts.UPDATE_DETAILS}</div>
              <div className="detailFields">
                <div className="detailField">
                  <div className="label">{texts.NAME_PLACEHOLDER}</div>
                  <input
                    type="text"
                    ref={newNameRef}
                    placeholder={userDetails.name}
                    disabled={updateDetailsLoader}
                  />
                </div>
                <div className="detailField">
                  <div className="label">{texts.EMAIL_PLACEHOLDER}</div>
                  <input
                    type="text"
                    ref={newEmailRef}
                    placeholder={userDetails.email}
                    disabled={updateDetailsLoader}
                  />
                </div>
                <button
                  className="orange updateDetails"
                  onClick={updateDetails}
                >
                  {updateDetailsLoader && (
                    <img className="loader" src={whiteLoader} alt="loader" />
                  )}
                  {!updateDetailsLoader && <span>{texts.ACCEPT}</span>}
                </button>
              </div>
              <div className="title">{texts.UPDATE_PASSWORD}</div>
              <div className="detailFields">
                <div className="detailField">
                  <div className="label">{texts.CURRENT_PASSWORD}</div>
                  <input
                    type="password"
                    ref={passwordRef}
                    disabled={updatePasswordLoader}
                  />
                </div>
                <div className="detailField">
                  <div className="label">{texts.NEW_PASSWORD}</div>
                  <input
                    type="password"
                    ref={newPasswordRef}
                    disabled={updatePasswordLoader}
                  />
                </div>
              </div>
              <button className="orange updateDetails" onClick={updatePassword}>
                {updatePasswordLoader && (
                  <img className="loader" src={whiteLoader} alt="loader" />
                )}
                {!updatePasswordLoader && <span>{texts.ACCEPT}</span>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
