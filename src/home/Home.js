import React, { useState, useEffect } from "react";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { accessAPI, logout } from "../utils/fetchFunctions";
import MatchQueue from "../orders/MatchQueue";
import PullQueue from "../orders/PullQueue";
import RefileQueue from "../orders/RefileQueue";

// The first screen of a shift. It opens on the match queue because that is
// the work nobody triggered and nobody would otherwise look for: cards on the
// shelf right now that answer a customer's wish, waiting to be pulled into
// their bag.
export default function Home() {
  const [loader, setLoader] = useState(true);

  const navigate = useNavigate();

  // On load, verify that the user is logged in, if it is, turn off the loader
  // if not, redirect to login
  useEffect(() => {
    accessAPI(
      "GET",
      "admin/me",
      null,
      () => setLoader(false),
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
            {/* Cards to put back first: until they are refiled, the shelf is
                wrong about what it holds. Then the bags waiting to be
                assembled — reserved copies still sitting in their pockets —
                and only then the match queue's new work. */}
            <RefileQueue />
            <PullQueue />
            <MatchQueue />
          </>
        )}
      </div>
    </div>
  );
}
