import "./App.css";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import Router from "./Router";
import ErrorBoundary from "./elementos/ErrorBoundary";
import Toaster from "./elementos/Toaster";
import Confirmer from "./elementos/Confirmer";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* MUI's reset. Every MUI component is written assuming border-box
          sizing, and without this the browser default (content-box) applies —
          which made a `height: 100%` card overflow its grid row by exactly its
          padding, so the result tiles overlapped each other vertically. */}
      <CssBaseline />
      <div className="app">
        {/* Inside BrowserRouter so the retry button can re-render the current
            route; outside Router so a throwing page cannot take the app down. */}
        <BrowserRouter>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
          {/* Outside the ErrorBoundary: an error page still gets toasts. */}
          <Toaster />
          <Confirmer />
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}
