import React, { useState, useEffect } from "react";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import { useNavigate } from "react-router-dom";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import "./users.css";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

const ROLES = ["customer", "staff", "owner"];

// Owner-only: who has an account and what they may do.
//
// There is no "create account" here on purpose. People register themselves from
// the store and the owner promotes them, so nobody ever sets a password on
// somebody else's behalf.
export default function Users() {
  const [loader, setLoader] = useState(true);
  const [players, setPlayers] = useState([]);
  const [me, setMe] = useState(null);
  // Pending role choices, so a mis-click is not a change until it is saved.
  const [picked, setPicked] = useState({});

  const navigate = useNavigate();

  function load() {
    accessAPI(
      "GET",
      "admin/player",
      null,
      (response) => {
        setPlayers(response);
        setPicked({});
        setLoader(false);
      },
      (response) => {
        // A staff member reaching this page gets the same 403 the API gives.
        alert(response.message);
        navigate("/home");
      }
    );
  }

  useEffect(() => {
    accessAPI(
      "GET",
      "admin/me",
      null,
      (response) => setMe(response),
      () => {
        logout();
        navigate("/login");
      }
    );
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveRole(player) {
    const role = picked[player.id] ?? player.role;
    if (role === player.role) return;
    accessAPI(
      "PUT",
      `admin/player/${player.id}/role`,
      { role },
      () => {
        load();
        alert(texts.ROLE_SAVED_OK);
      },
      (response) => alert(response.message)
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      {loader && <Loader color="blue" />}
      {!loader && (
        <div className="usersContainer">
          <div className="title">{texts.USERS_TITLE}</div>
          <div className="usersHint">{texts.USERS_HINT}</div>

          <div className="userTable">
            <div className="userRow head">
              <span>{texts.COL_ACCOUNT}</span>
              <span>{texts.COL_ROLE}</span>
              <span />
            </div>
            {players.map((player) => {
              // The API refuses to let an owner change their own role; saying
              // so here is friendlier than letting them find out by error.
              const isMe = me && player.username === me.username;
              return (
                <div className="userRow" key={player.id}>
                  <span className="userName">
                    {player.name}
                    <span className="userMeta">
                      {" "}
                      {player.username}
                      {isMe && ` · ${texts.ROLE_YOU}`}
                    </span>
                  </span>

                  <TextField select SelectProps={{ native: true }}
                    value={picked[player.id] ?? player.role}
                    disabled={isMe}
                    onChange={(e) =>
                      setPicked({ ...picked, [player.id]: e.target.value })
                    }
                  >
                    {ROLES.map((role) => (
                      <option value={role} key={role}>
                        {texts[`ROLE_${role}`]}
                      </option>
                    ))}
                  </TextField>

                  <Button size="small"
                    disabled={
                      isMe || (picked[player.id] ?? player.role) === player.role
                    }
                    onClick={() => saveRole(player)}
                  >
                    {texts.SAVE_ROLE}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
