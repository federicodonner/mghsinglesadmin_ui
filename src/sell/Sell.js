import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../header/Header";
import SellSearchResult from "./SellSearchResult";
import CardInSale from "./CardInSale";
import "./sell.css";
import {
  accessAPI,
  logout,
  storeInLS,
  deleteFromLS,
} from "../utils/fetchFunctions";
import texts from "../data/texts";
import whiteLoader from "../images/whiteLoader.svg";

export default function Sell() {
  const [loader, setLoader] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [searchLoader, setSearchLoader] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [cardsInSale, setCardsInSale] = useState([]);
  const [cardsInSalePreviousLength, setCardsInSalePreviousLength] = useState(0);

  let navigate = useNavigate();

  const cardRef = useRef(null);
  // When the component loads, verify if the user is loaded
  useEffect(() => {
    accessAPI(
      "GET",
      "user/me",
      null,
      (response) => {
        // If the response is 200, means the user is logged in
        setLoggedIn(true);
        // If the user is a superuser, store it in LS
        if (response.superuser) {
          storeInLS(process.env.REACT_APP_LS_SUPERUSER, "1");
        } else {
          // If the user is logged in but it's not a superuser, navigate out of the section
          navigate("/");
          deleteFromLS(process.env.REACT_APP_LS_SUPERUSER);
        }
      },
      (response) => {
        // If the user is not logged in, turn off the loader
        navigate("/");
      }
    );
  }, []);

  // Every time the cards in sale updates, select the search bar
  useEffect(() => {
    // If the number of cards in the sale changed, set the focus
    // This is necesary because the state updates when prices or quantity change
    if (cardsInSalePreviousLength != cardsInSale.length) {
      cardRef.current.focus();
      cardRef.current.select();
    }
    setCardsInSalePreviousLength(cardsInSale.length);
  }, [cardsInSale]);

  // Function triggerd when a card is searched
  function findCard(e) {
    // Prevent the default form submnit;
    e.preventDefault();
    setSearchLoader(true);
    accessAPI(
      "GET",
      "store/search/" + cardRef.current.value,
      null,
      (response) => {
        // If there are cards in the reponse, show the options
        if (response.cards) {
          setSearchLoader(false);
          // If there is only one card, add it to the sale
          if (response.cards.length == 1) {
            var cardsInSaleForEdit = JSON.parse(JSON.stringify(cardsInSale));
            response.cards[0].saleQuantity = 1;
            cardsInSaleForEdit.push(response.cards[0]);
            setCardsInSale(cardsInSaleForEdit);
          } else {
            setSearchResults(response.cards);
          }
        }
      },
      (response) => {
        if (response.status == 404) {
          alert(response.message);
          setSearchLoader(false);
          cardRef.current.focus();
          cardRef.current.select();
        } else {
          navigate("/login");
        }
      }
    );
  }

  // Function triggered from child components to select a card
  function selectCard(card) {
    var cardsInSaleForEdit = JSON.parse(JSON.stringify(cardsInSale));
    card.saleQuantity = 1;
    cardsInSaleForEdit.push(card);
    setCardsInSale(cardsInSaleForEdit);

    // Clears the search results to hide the modal
    setSearchResults(null);
    setSearchLoader(false);
  }

  // Function triggered from child component to delete a card from list
  function deleteCard(cardId) {
    setCardsInSale(cardsInSale.filter((card) => card.id !== cardId));
  }

  // Function triggered by the price update of a card
  function updatePrice(cardId, newPrice) {
    setCardsInSale(
      cardsInSale.map((card) => {
        if (card.id === cardId) {
          card.price = newPrice;
        }
        return card;
      })
    );
  }

  // Function triggered by the quantity update of a card
  function updateQuantity(cardId, newQuantity) {
    setCardsInSale(
      cardsInSale.map((card) => {
        if (card.id === cardId) {
          card.saleQuantity = newQuantity;
        }
        return card;
      })
    );
  }

  // Function to send the sale to the server and register it
  function processSale() {
    setLoader(true);
    var cardMissingPrice = false;
    // Verify that every card has a price
    // Copy the array to edit it and store it in state
    cardsInSale.forEach((card, index) => {
      if (!card.price) {
        cardMissingPrice = true;
      }
    });
    if (cardMissingPrice) {
      setLoader(false);
      return false;
    }

    accessAPI(
      "POST",
      "sale",
      JSON.stringify({ soldCards: cardsInSale }),
      (response) => {
        // If the sale is successful, display a message and refresh
        setLoader(false);
        alert(response.message);
        setSearchResults(null);
        setCardsInSale([]);
      },
      (response) => {
        // If the sale failed for some reason, show the error and return
        // If there is a card indicated in the error, show the name
        alert(
          response.card
            ? response.message + " - " + response.card.cardName
            : response.message
        );
        setLoader(false);
      }
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={loggedIn} />
      <div className="content">
        {loader && <div>This is a loader</div>}
        {!loader && (
          <>
            <div className="searchContainer">
              <form onSubmit={findCard}>
                <input
                  type="text"
                  ref={cardRef}
                  placeholder={texts.CARD_NAME}
                  disabled={searchLoader || loader}
                />
              </form>
              <button className="orange search" onClick={findCard}>
                {searchLoader && (
                  <img className="loader" src={whiteLoader} alt="loader" />
                )}
                {!searchLoader && <span>{texts.SEARCH}</span>}
              </button>
            </div>
            <div className="cardsInSale">
              <div className="title">{texts.CARDS_IN_SALE}</div>
              {cardsInSale.map((card, index) => {
                return (
                  <CardInSale
                    card={card}
                    key={index}
                    showBorder={true}
                    updatePrice={updatePrice}
                    updateQuantity={updateQuantity}
                    deleteCard={deleteCard}
                  />
                );
              })}
              {cardsInSale.length > 0 && (
                <button className="orange finishSale" onClick={processSale}>
                  {texts.FINISH_SALE}
                </button>
              )}
            </div>
          </>
        )}

        {searchResults && (
          <>
            <div className="modalCover"></div>
            <div className="sellSelectVersionModal modal">
              {searchResults.map((card, index) => {
                return (
                  <SellSearchResult
                    key={index}
                    card={card}
                    selectCard={selectCard}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
