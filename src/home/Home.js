import React, { useState, useEffect, useRef } from "react";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { accessAPI, logout } from "../utils/fetchFunctions";
import texts from "../data/texts";

export default function Home() {
  const [loader, setLoader] = useState(true);
  const [user, setUser] = useState(null);
  const [collections, setCollections] = useState([]);

  const navigate = useNavigate();

  const ammountRef = useRef(null);
  const collectionRef = useRef(null);

  // On load, fetch user data
  useEffect(() => {}, []);

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      <div className="content">
        {loader && <Loader />}
        {!loader && (
          <>
            <div className="">Home</div>
          </>
        )}
      </div>
    </div>
  );
}
