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

  function toggleInShop(unit) {
    accessAPI(
      "PUT",
      `storage/${unit.id}`,
      { inshop: !unit.inshop },
      () => load(),
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
                className={unit.inshop ? "storageRow" : "storageRow away"}
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
                {/* Only a customer's container can leave the shop. */}
                {unit.owner ? (
                  <button
                    className={unit.inshop ? "light small" : "dark small"}
                    onClick={() => toggleInShop(unit)}
                  >
                    {unit.inshop ? texts.IN_SHOP : texts.WITH_CUSTOMER}
                  </button>
                ) : (
                  <span className="storageBadge">{texts.IN_SHOP}</span>
                )}
                <button className="light small" onClick={() => rename(unit)}>
                  {texts.RENAME}
                </button>
                <button className="light small" onClick={() => removeUnit(unit)}>
                  {texts.DELETE}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
