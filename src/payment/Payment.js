import React, { useState, useEffect, useRef } from "react";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import "./payment.css";
import { accessAPI, logout } from "../utils/fetchFunctions";
import texts from "../data/texts";

export default function Payment() {
  const [loader, setLoader] = useState(true);
  const [user, setUser] = useState(null);
  const [collections, setCollections] = useState([]);

  const navigate = useNavigate();

  const ammountRef = useRef(null);
  const collectionRef = useRef(null);

  // On load, fetch user data
  useEffect(() => {
    accessAPI(
      "GET",
      "user/me",
      null,
      (response) => {
        setUser(response);
      },
      (response) => {
        // If there is a problem with the user, sign them out and navigate to login
        alert(response.message);
        logout();
        navigate("/login");
      }
    );

    accessAPI(
      "GET",
      "collection/all",
      null,
      (response) => {
        setCollections(response);
      },
      (response) => {
        // If there is a problem with the user, sign them out and navigate to login
        alert(response.message);
        logout();
        navigate("/login");
      }
    );
  }, []);

  // When  the user and the collections are loaded, turn off the loader
  useEffect(() => {
    if (user && collections) {
      setLoader(false);
    }
  }, [user, collections]);

  // Function tiggered by the process payment button
  function processPayment() {
    // Verifies that the user selected something
    if (
      !ammountRef.current.value ||
      !collectionRef.current.value ||
      collectionRef.current.value === "DEFAULT"
    ) {
      return false;
    }

    setLoader(true);
    accessAPI(
      "POST",
      "payment",
      JSON.stringify({
        collectionId: collectionRef.current.value,
        ammount: ammountRef.current.value,
      }),
      (response) => {
        alert(texts.PAYMENT_PROCESSED);
        setLoader(false);
      },
      (response) => {
        // If there is a problem with the user, sign them out and navigate to login
        alert(response.message);
        logout();
        navigate("/login");
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
            <div className="paymentFormContainer">
              <div className="title">{texts.PAYMENT_TITLE}</div>
              <div className="inputContainer">
                <input
                  type="number"
                  placeholder={texts.AMMOUNT_PLACEHOLDER}
                  ref={ammountRef}
                />
              </div>
              <div className="inputContainer">
                <select
                  name="account"
                  id="account"
                  defaultValue="DEFAULT"
                  ref={collectionRef}
                >
                  <option value="DEFAULT" disabled>
                    {texts.SELECT_USER}
                  </option>
                  {collections.map((collection) => {
                    return (
                      <option value={collection.id} key={collection.id}>
                        {collection.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button className="orange" onClick={processPayment}>
                {texts.ACCEPT}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
