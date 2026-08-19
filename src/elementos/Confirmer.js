import React, { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import texts from "../data/texts";
import { setConfirmListener } from "../utils/confirm";

// The single on-screen surface for confirmDialog() questions. Mounted once in
// App; each call renders the question in a MUI dialog and resolves the
// caller's promise with the answer. Closing by clicking away or Escape is a
// "no" — the safe answer to a question that was not answered.
export default function Confirmer() {
  const [asking, setAsking] = useState(null);

  useEffect(() => {
    setConfirmListener(
      (message) =>
        new Promise((resolve) => {
          setAsking({ message, resolve });
        })
    );
    return () => setConfirmListener(null);
  }, []);

  function answer(value) {
    asking?.resolve(value);
    setAsking(null);
  }

  return (
    <Dialog open={Boolean(asking)} onClose={() => answer(false)}>
      <DialogContent>
        <DialogContentText>{asking?.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => answer(false)}>
          {texts.CANCEL}
        </Button>
        <Button onClick={() => answer(true)} autoFocus>
          {texts.ACCEPT}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
