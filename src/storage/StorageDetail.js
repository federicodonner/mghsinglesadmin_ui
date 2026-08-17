import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import BinderPage from "./BinderPage";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import "./storage.css";

const TYPE_LABELS = {
  binder: texts.BINDER,
  sorted_box: texts.SORTED_BOX,
  unsorted_box: texts.UNSORTED_BOX,
};

export default function StorageDetail() {
  const [loader, setLoader] = useState(true);
  const [unit, setUnit] = useState(null);
  const [spread, setSpread] = useState(0);

  const { storageId } = useParams();
  const navigate = useNavigate();

  const load = useCallback(
    (targetSpread) => {
      // The binder endpoint takes a spread; boxes ignore it.
      const query =
        targetSpread === undefined ? "" : `?spread=${targetSpread}`;
      accessAPI(
        "GET",
        `storage/${storageId}${query}`,
        null,
        (response) => {
          setUnit(response);
          setLoader(false);
        },
        (response) => {
          alert(response.message);
          logout();
          navigate("/login");
        }
      );
    },
    [storageId, navigate]
  );

  useEffect(() => {
    // Ask for a spread first; if it turns out to be a box the extra param is
    // simply ignored server-side.
    load(spread);
  }, [load, spread]);

  function removePlacement(placementid) {
    accessAPI(
      "DELETE",
      `storage/placement/${placementid}`,
      null,
      () => load(spread),
      (response) => alert(response.message)
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      {loader && <Loader color="blue" />}
      {!loader && unit && (
        <div className="storageContainer">
          <div className="storageHeader">
            <Link to="/storage" className="backLink">
              {texts.BACK_TO_STORAGE}
            </Link>
            <span className="storageTitle">{unit.name}</span>
            <span className="storageType">{TYPE_LABELS[unit.type]}</span>
            <span className="storageOwner">
              {unit.owner ? unit.owner.name : texts.SHOP}
            </span>
            {!unit.inshop && (
              <span className="awayWarning">{texts.NOT_IN_SHOP_WARNING}</span>
            )}
          </div>

          {unit.type === "binder" && (
            <>
              <div className="spreadNav">
                <button
                  className="light"
                  disabled={spread <= 0}
                  onClick={() => setSpread(spread - 1)}
                >
                  {texts.PREVIOUS}
                </button>
                <span className="spreadLabel">
                  {(unit.pages ?? [])
                    .filter(Boolean)
                    .map((page) => page.page)
                    .join(" · ")}
                </span>
                <button
                  className="light"
                  disabled={spread >= (unit.maxSpread ?? 0)}
                  onClick={() => setSpread(spread + 1)}
                >
                  {texts.NEXT}
                </button>
              </div>
              <div className="binderSpread">
                {(unit.pages ?? []).map((page, index) => (
                  <BinderPage
                    page={page}
                    key={page ? page.page : `blank-${index}`}
                    onCardClick={(card) => {
                      if (
                        window.confirm(`${texts.DELETE}: ${card.name}?`)
                      ) {
                        removePlacement(card.placementid);
                      }
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {unit.type !== "binder" && (
            <div className="boxList">
              {(unit.cards ?? []).map((card) => (
                <div className="boxRow" key={card.placementid}>
                  {/* Only a sorted box has a meaningful position. */}
                  {unit.type === "sorted_box" && (
                    <span className="boxSequence">{card.sequence}</span>
                  )}
                  <span className="boxName">{card.name}</span>
                  <span className="boxSet">
                    {(card.cardsetcode ?? "").toUpperCase()}
                  </span>
                  <span className="boxMeta">{card.condition}</span>
                  <span className="boxMeta">{card.language}</span>
                  <span className="boxMeta">{card.owner}</span>
                  <button
                    className="light small"
                    onClick={() => removePlacement(card.placementid)}
                  >
                    {texts.DELETE}
                  </button>
                </div>
              ))}
              {!(unit.cards ?? []).length && (
                <div className="boxRow">{texts.EMPTY_POCKET}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
