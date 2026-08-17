import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import "./storage.css";

const TYPE_LABELS = {
  binder: texts.BINDER,
  sorted_box: texts.SORTED_BOX,
  unsorted_box: texts.UNSORTED_BOX,
};

const STATE_LABELS = {
  for_sale: texts.STATE_FOR_SALE,
  retired: texts.STATE_RETIRED,
  released: texts.STATE_RELEASED,
  returning: texts.STATE_RETURNING,
};

// The label for a move depends on where it starts, not just where it lands:
// retired -> for_sale is cancelling a retirement, returning -> for_sale is
// taking delivery. The API decides which moves are offered (`cando`); this only
// names them.
function moveLabel(from, to) {
  if (to === "released") return texts.DO_RELEASE;
  if (to === "for_sale") {
    return from === "retired" ? texts.DO_CANCEL_RETIRE : texts.DO_ACCEPT;
  }
  return to;
}

export default function Storage() {
  const [loader, setLoader] = useState(true);
  const [units, setUnits] = useState([]);
  const [collections, setCollections] = useState([]);

  const nameRef = useRef(null);
  const typeRef = useRef(null);
  const ownerRef = useRef(null);

  const navigate = useNavigate();

  function bail(response) {
    alert(response.message);
    logout();
    navigate("/login");
  }

  function load() {
    accessAPI(
      "GET",
      "storage",
      null,
      (response) => {
        setUnits(response);
        setLoader(false);
      },
      bail
    );
  }

  useEffect(() => {
    load();
    // The owner dropdown lists collections, since that is how the API exposes
    // players to the admin app.
    accessAPI(
      "GET",
      "collection/all",
      null,
      (response) => setCollections(response),
      () => setCollections([])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function createUnit(e) {
    e.preventDefault();
    const name = nameRef.current.value.trim();
    if (!name) return;
    const owner = ownerRef.current.value;
    accessAPI(
      "POST",
      "storage",
      {
        name,
        type: typeRef.current.value,
        playerid: owner ? parseInt(owner, 10) : null,
      },
      () => {
        nameRef.current.value = "";
        load();
      },
      (response) => alert(response.message)
    );
  }

  // Hand a customer's container along its lifecycle. Releasing it is the only
  // move with a consequence worth reporting: copies already promised to a buyer
  // stay behind on the counter, so whoever hands the binder over has to know
  // not to put them in it.
  function move(unit, to) {
    accessAPI(
      "POST",
      `storage/${unit.id}/state`,
      { state: to },
      (response) => {
        if (to === "released") {
          const held = response.heldback || [];
          alert(
            held.length
              ? `${texts.HELD_BACK}\n` +
                  held
                    .map((c) => `- ${c.name} (#${c.copyindex})`)
                    .join("\n")
              : texts.NOTHING_HELD_BACK
          );
        }
        load();
      },
      (response) => alert(response.message)
    );
  }

  function rename(unit) {
    const name = window.prompt(texts.RENAME, unit.name);
    if (!name || !name.trim()) return;
    accessAPI(
      "PUT",
      `storage/${unit.id}`,
      { name: name.trim() },
      () => load(),
      (response) => alert(response.message)
    );
  }

  function removeUnit(unit) {
    if (!window.confirm(texts.CONFIRM_DELETE_STORAGE)) return;
    accessAPI(
      "DELETE",
      `storage/${unit.id}`,
      null,
      () => load(),
      (response) => alert(response.message)
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      {loader && <Loader color="blue" />}
      {!loader && (
        <div className="storageContainer">
          <form className="storageForm" onSubmit={createUnit}>
            <span className="formTitle">{texts.NEW_STORAGE}</span>
            <input
              type="text"
              placeholder={texts.STORAGE_NAME}
              ref={nameRef}
            />
            <select ref={typeRef} defaultValue="binder">
              <option value="binder">{texts.BINDER}</option>
              <option value="sorted_box">{texts.SORTED_BOX}</option>
              <option value="unsorted_box">{texts.UNSORTED_BOX}</option>
            </select>
            <select ref={ownerRef} defaultValue="">
              <option value="">{texts.SHOP}</option>
              {collections.map((collection) => (
                <option value={collection.id} key={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            <button type="submit" className="dark">
              {texts.CREATE}
            </button>
          </form>

          <div className="storageList">
            <div className="title">{texts.STORAGE_TITLE}</div>
            {units.map((unit) => (
              <div
                className={unit.forsale ? "storageRow" : "storageRow away"}
                key={unit.id}
              >
                <Link to={`/storage/${unit.id}`} className="storageName">
                  {unit.name}
                </Link>
                <span className="storageType">{TYPE_LABELS[unit.type]}</span>
                <span className="storageOwner">
                  {unit.owner ? unit.owner.name : texts.SHOP}
                </span>
                <span className="storageCount">
                  {unit.cardcount} {texts.CARDS}
                </span>
                <span className="storageBadge">
                  {STATE_LABELS[unit.state]}
                </span>
                {/* Only a customer's container moves, and only along the moves
                    the API says the shop may make from here. */}
                {(unit.cando || []).map((to) => (
                  <button
                    key={to}
                    className="dark small"
                    onClick={() => move(unit, to)}
                  >
                    {moveLabel(unit.state, to)}
                  </button>
                ))}
                {/* The shop can only rename or delete what it physically
                    holds — a released container is the customer's. */}
                {unit.inshop !== false && (
                  <>
                    <button className="light small" onClick={() => rename(unit)}>
                      {texts.RENAME}
                    </button>
                    <button
                      className="light small"
                      onClick={() => removeUnit(unit)}
                    >
                      {texts.DELETE}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
