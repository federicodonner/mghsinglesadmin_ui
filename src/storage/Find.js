import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "../header/Header";
import Loader from "../loader/Loader";
import BinderPage from "./BinderPage";
import texts from "../data/texts";
import { accessAPI } from "../utils/fetchFunctions";
import "./storage.css";

const TYPE_LABELS = {
  binder: texts.BINDER,
  sorted_box: texts.SORTED_BOX,
  unsorted_box: texts.UNSORTED_BOX,
};

// The API answers per placed copy, which is the right data but the wrong
// shape to read: three copies stacked in one pocket would otherwise draw the
// same binder page three times. Collapse hits that share a page (or an
// unsorted box) into one block, keeping every spot they were found in.
function groupHits(hits) {
  const groups = [];
  const byKey = new Map();

  for (const hit of hits) {
    const key =
      hit.storage.type === "binder"
        ? `binder:${hit.storage.id}:${hit.page}`
        : hit.storage.type === "unsorted_box"
        ? `unsorted:${hit.storage.id}`
        : // Each position in a sorted box is genuinely a different answer.
          `sorted:${hit.placementid}`;

    if (!byKey.has(key)) {
      const group = { key, ...hit, spots: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).spots.push(hit);
  }
  return groups;
}

// Answers "where is this card?". Each container type gets the level of detail
// it can actually support: a binder shows the page, a sorted box shows the
// position and what is next to it, an unsorted box just names the box.
export default function Find() {
  const [loader, setLoader] = useState(false);
  const [results, setResults] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const searchRef = useRef(null);

  function search(e) {
    e.preventDefault();
    const query = searchRef.current.value.trim();
    if (!query) return;
    setLoader(true);
    setNotFound(false);
    accessAPI(
      "GET",
      `find/${encodeURIComponent(query)}`,
      null,
      (response) => {
        setResults(response);
        setLoader(false);
      },
      () => {
        setResults(null);
        setNotFound(true);
        setLoader(false);
      }
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      <div className="storageContainer">
        <form className="findForm" onSubmit={search}>
          <span className="formTitle">{texts.FIND_TITLE}</span>
          <input
            type="text"
            placeholder={texts.FIND_PLACEHOLDER}
            ref={searchRef}
          />
          <button type="submit" className="dark">
            {texts.FIND}
          </button>
        </form>

        {loader && <Loader color="blue" />}
        {notFound && <div className="findEmpty">{texts.NO_RESULTS}</div>}

        {!loader &&
          results &&
          groupHits(results.results).map((hit) => (
            <div className="findResult" key={hit.key}>
              <div className="findResultHeader">
                <Link to={`/storage/${hit.storage.id}`} className="storageName">
                  {hit.storage.name}
                </Link>
                <span className="storageType">
                  {TYPE_LABELS[hit.storage.type]}
                </span>
                <span className="storageOwner">
                  {hit.storage.owner ?? texts.SHOP}
                </span>
                {hit.storage.state !== "for_sale" && (
                  <span className="awayWarning">
                    {texts.NOT_IN_SHOP_WARNING}
                  </span>
                )}
              </div>

              <div className="findWhere">
                {hit.name}
                {hit.storage.type === "binder" && (
                  <>
                    {" — "}
                    {texts.PAGE} {hit.page}
                    {", "}
                    {/* Copies can share a page and even a pocket — a pocket
                        holds a stack — so count per pocket rather than
                        repeating "pocket 1" once per copy. */}
                    {Object.entries(
                      hit.spots.reduce((perPocket, spot) => {
                        perPocket[spot.pocket] = (perPocket[spot.pocket] ?? 0) + 1;
                        return perPocket;
                      }, {})
                    )
                      .map(
                        ([pocket, count]) =>
                          `${texts.IN_POCKET} ${pocket}` +
                          (count > 1 ? ` (${count})` : "")
                      )
                      .join(", ")}
                  </>
                )}
                {hit.storage.type === "sorted_box" && (
                  <>
                    {" — "}
                    {texts.POSITION_IN_BOX} {hit.positionInBox} {texts.OF}{" "}
                    {hit.boxSize}
                  </>
                )}
                {hit.storage.type === "unsorted_box" && hit.spots.length > 1 && (
                  <> {` — ${hit.spots.length} ${texts.CARDS}`}</>
                )}
              </div>

              {/* A binder can show the actual page, with the hit highlighted. */}
              {hit.storage.type === "binder" && hit.pageContents && (
                <div className="binderSpread single">
                  <BinderPage page={hit.pageContents} />
                </div>
              )}

              {hit.storage.type === "sorted_box" && (
                <div className="neighbours">
                  <span className="neighboursLabel">
                    {texts.SURROUNDING_CARDS}
                  </span>
                  {hit.neighbours.map((card) => (
                    <div
                      className={
                        card.isMatch ? "neighbour match" : "neighbour"
                      }
                      key={card.placementid}
                    >
                      <span className="boxSequence">{card.sequence}</span>
                      <span className="boxName">{card.name}</span>
                      <span className="boxSet">
                        {(card.cardsetcode ?? "").toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
