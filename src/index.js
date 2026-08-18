import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// React 18 root API. The old ReactDOM.render still worked but logged a
// deprecation warning and opted the whole tree out of concurrent rendering.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
