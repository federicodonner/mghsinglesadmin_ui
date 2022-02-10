import React, { useState, useEffect } from "react";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { accessAPI, logout } from "../utils/fetchFunctions";

export default function Home() {
  const [loader, setLoader] = useState(true);
  const [player, setPlayer] = useState(null);

  const navigate = useNavigate();

  // On load, verify that the user is logged in, if it is, turn off the loader
  // if not, redirect to login
  useEffect(() => {
    accessAPI(
      "GET",
      "admin/me",
      null,
      (response) => {
        setPlayer(response);
        setLoader(false);
      },
      (response) => {
        logout();
        navigate("login");
      }
    );
  }, [navigate]);

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      <div className="content">
        {loader && <Loader />}
        {!loader && (
          <>
            <div className="">{player.name}</div>
          </>
        )}
      </div>
    </div>
  );
}
