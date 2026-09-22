import React, { useState, useEffect } from "react";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { accessAPI, logout } from "../utils/fetchFunctions";
import MatchQueue from "../orders/MatchQueue";
import PrepareQueue from "../orders/PrepareQueue";
import RefileQueue from "../orders/RefileQueue";
import UnpricedQueue from "../pricing/UnpricedQueue";

// The first screen of a shift. It opens on the match queue because that is
// the work nobody triggered and nobody would otherwise look for: cards on the
// shelf right now that answer a customer's wish, waiting to be pulled into
// their bag.
export default function Home() {
  // The loader stays on until every section has its REAL data: turning it
  // off after only the session check briefly showed four empty queues that
  // then filled in, which read as the page flickering through a wrong state.
  // The sections mount hidden from the start, so their fetches run in
  // parallel with the session check instead of after it.
  const [ready, setReady] = useState({
    me: false,
    refile: false,
    unpriced: false,
    prepare: false,
    match: false,
  });
  const loader = Object.values(ready).some((done) => !done);
  const markReady = (key) =>
    setReady((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  const navigate = useNavigate();

  // On load, verify that the user is logged in; if not, redirect to login.
  useEffect(() => {
    accessAPI(
      "GET",
      "admin/me",
      null,
      () => markReady("me"),
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
        <div style={{ display: loader ? "none" : "block" }}>
          {/* Cards to put back first: until they are refiled, the shelf is
              wrong about what it holds. */}
          <RefileQueue onLoaded={() => markReady("refile")} />
          {/* Cards with no price yet — invisible to shoppers until priced. */}
          <UnpricedQueue onLoaded={() => markReady("unpriced")} />
          {/* Orders a customer already paid attention to: confirmed from
              their cart and waiting to be assembled. */}
          <PrepareQueue onLoaded={() => markReady("prepare")} />
          <MatchQueue onLoaded={() => markReady("match")} />
        </div>
      </div>
    </div>
  );
}
