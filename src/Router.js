import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./home/Home";
import Login from "./login/Login";
import Sell from "./sell/Sell";
import Account from "./account/Account";
import Payment from "./payment/Payment";
import Storage from "./storage/Storage";
import StorageDetail from "./storage/StorageDetail";
import Orders from "./orders/Orders";
import Pricing from "./pricing/Pricing";
import Users from "./users/Users";

class Router extends React.Component {
  render() {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sell" element={<Sell />} />
        <Route path="/account" element={<Account />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/storage/:storageId" element={<StorageDetail />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/users" element={<Users />} />
        <Route path="*" element={<Home />} />
      </Routes>
    );
  }
}

export default Router;
