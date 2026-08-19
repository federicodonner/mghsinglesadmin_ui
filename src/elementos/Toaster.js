import React, { useState, useEffect } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { setToastListener } from "../utils/toast";

// The single on-screen surface for toast() messages.
//
// Mounted once in App, not per-page: pages fire toasts from deep inside fetch
// callbacks, sometimes right before navigating away, and a toast owned by the
// page that fired it would vanish with the page.
export default function Toaster() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("error");

  useEffect(() => {
    setToastListener((msg, sev) => {
      setMessage(msg);
      setSeverity(sev);
      setOpen(true);
    });
    return () => setToastListener(null);
  }, []);

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      // Clickaway would dismiss the toast on the user's very next interaction,
      // usually before it has been read.
      onClose={(e, reason) => reason !== "clickaway" && setOpen(false)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={severity}
        variant="filled"
        onClose={() => setOpen(false)}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
