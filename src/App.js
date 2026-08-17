import "./App.css";
import { BrowserRouter } from "react-router-dom";
import Router from "./Router";
import ErrorBoundary from "./elementos/ErrorBoundary";

export default function App() {
  return (
    <div className="app">
      <div className="barraSuperior"></div>
      {/* Inside BrowserRouter so the retry button can re-render the current
          route; outside Router so a throwing page cannot take the app down. */}
      <BrowserRouter>
        <ErrorBoundary>
          <Router />
        </ErrorBoundary>
      </BrowserRouter>
    </div>
  );
}
