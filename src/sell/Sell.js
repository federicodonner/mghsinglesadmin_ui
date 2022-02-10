import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../header/Header";
import SellSearchResult from "./SellSearchResult";
import CardInSale from "./CardInSale";
import Loader from "../loader/Loader";
import "./sell.css";
import { accessAPI, logout } from "../utils/fetchFunctions";
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
      "admin/me",
      null,
      (response) => {
        // If the response is 200, means the user is logged in
        setLoggedIn(true);
      },
      (response) => {
        // If the user is not logged in, turn off the loader
        logout();
        navigate("/");
      }
    );
  }, [navigate]);

  // Every time the cards in sale updates, select the search bar
  useEffect(() => {
    // If the number of cards in the sale changed, set the focus
    // This is necesary because the state updates when prices or quantity change
    if (cardsInSalePreviousLength !== cardsInSale.length) {
      cardRef.current.focus();
      cardRef.current.select();
    }
    setCardsInSalePreviousLength(cardsInSale.length);
  }, [cardsInSale, cardsInSalePreviousLength]);

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
          if (response.cards.length === 1) {
            var cardsInSaleForEdit = JSON.parse(JSON.stringify(cardsInSale));
            response.cards[0].saleQuantity = 1;
            cardsInSaleForEdit.push(response.cards[0]);
            console.log(cardsInSaleForEdit);
            setCardsInSale(cardsInSaleForEdit);
          } else {
            console.log(response.cards);
            setSearchResults(response.cards);
          }
        }
      },
      (response) => {
        if (response.status === 404) {
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
      "admin/sale",
      JSON.stringify({ soldCards: cardsInSale }),
      (response) => {
        // If the sale is successful, display a message and refresh
        setLoader(false);
        alert(response.message);
        setSearchResults(null);
        setCardsInSale([]);
      },
      (response) => {
        // If there was a login problem, logout the user and take them to login
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate("/");
        }
        // If the sale failed for other reason, show the error and return
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
        {loader && <Loader />}
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
                <button className="dark search" onClick={findCard}>
                  {searchLoader && (
                    <img className="loader" src={whiteLoader} alt="loader" />
                  )}
                  {!searchLoader && <span>{texts.SEARCH}</span>}
                </button>
              </form>
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
                <button className="dark finishSale" onClick={processSale}>
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
