import "./App.css";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import Router from "./Router";
import ErrorBoundary from "./elementos/ErrorBoundary";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        {/* Inside BrowserRouter so the retry button can re-render the current
            route; outside Router so a throwing page cannot take the app down. */}
        <BrowserRouter>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}
