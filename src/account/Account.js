import React, { useState, useEffect } from "react";
import { toast } from "../utils/toast";
import Header from "../header/Header";
import Title from "../elementos/Title";
import Loader from "../loader/Loader";
import SideForm from "../elementos/SideForm";
import { useNavigate } from "react-router-dom";
import "./account.css";
import { accessAPI, logout } from "../utils/fetchFunctions";
import { clearRole } from "../utils/role";
import texts from "../data/texts";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import LogoutIcon from "@mui/icons-material/Logout";

// The staff member's own account, in the same shape as the customer's — details
// edited through a sidebar, password changed through a sidebar, sign-out at the
// bottom. No balance card: the shop's own accounts have no consignment credit.
export default function Account() {
  const [loader, setLoader] = useState(true);
  const [me, setMe] = useState(null);
  const [sidebar, setSidebar] = useState(null); // "details" | "password"
  const navigate = useNavigate();

  // Signing out clears the stored role too, the same as the top bar used to —
  // the role plumbing lives in localStorage alongside the token.
  function signOut() {
    logout();
    clearRole();
    navigate("/login");
  }

  function load() {
    accessAPI(
      "GET",
      "admin/me",
      null,
      (response) => {
        setMe(response);
        setLoader(false);
      },
      (response) => {
        toast(response.message);
        signOut();
      }
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      <div className="content">
        {loader && <Loader />}
        {!loader && me && (
          <Box sx={{ maxWidth: 640, mx: "auto" }}>
            <Title title={texts.MY_ACCOUNT} />

            {/* Details */}
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Typography variant="h6">{texts.MY_DETAILS}</Typography>
                <Button size="small" onClick={() => setSidebar("details")}>
                  {texts.EDIT}
                </Button>
              </Stack>
              <DetailRow label={texts.NAME_PLACEHOLDER} value={me.name} />
              <DetailRow label={texts.EMAIL_PLACEHOLDER} value={me.email} />
              <DetailRow
                label={texts.PHONE_PLACEHOLDER}
                value={me.phone || texts.NOT_SET}
              />
              <Button
                size="small"
                sx={{ mt: 2 }}
                onClick={() => setSidebar("password")}
              >
                {texts.CHANGE_PASSWORD}
              </Button>
            </Paper>

            {/* Signing out lives here now, not in the top bar. */}
            <Button
              variant="outlined"
              color="error"
              fullWidth
              startIcon={<LogoutIcon />}
              sx={{ mt: 3 }}
              onClick={signOut}
            >
              {texts.LOGOUT}
            </Button>
          </Box>
        )}
      </div>

      <SideForm
        open={sidebar === "details"}
        onClose={() => setSidebar(null)}
        title={texts.MY_DETAILS}
      >
        {sidebar === "details" && me && (
          <EditDetailsForm
            me={me}
            onSaved={(updated) => {
              setMe((prev) => ({ ...prev, ...updated }));
              setSidebar(null);
              toast(texts.UPDATED_DETAILS, "success");
            }}
            onAuthFail={(msg) => {
              toast(msg);
              signOut();
            }}
          />
        )}
      </SideForm>

      <SideForm
        open={sidebar === "password"}
        onClose={() => setSidebar(null)}
        title={texts.CHANGE_PASSWORD}
      >
        {sidebar === "password" && (
          <ChangePasswordForm
            onSaved={() => {
              setSidebar(null);
              toast(texts.PASSWORD_CHANGED, "success");
            }}
            onAuthFail={(msg) => {
              toast(msg);
              signOut();
            }}
          />
        )}
      </SideForm>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      gap={2}
      sx={{ py: 0.75 }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}

// Edit name, email and phone. Email is the login identifier, so it is editable
// here (it is the account's own owner) but flagged as such.
function EditDetailsForm({ me, onSaved, onAuthFail }) {
  const [name, setName] = useState(me.name ?? "");
  const [email, setEmail] = useState(me.email ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [saving, setSaving] = useState(false);

  function save() {
    const data = {};
    if (name.trim() && name.trim() !== me.name) data.name = name.trim();
    if (email.trim() && email.trim() !== me.email) data.email = email.trim();
    // Phone always rides along so clearing it (empty string) is a real change.
    if ((phone ?? "") !== (me.phone ?? "")) data.phone = phone.trim();
    if (!Object.keys(data).length) {
      onSaved({});
      return;
    }
    setSaving(true);
    accessAPI(
      "PUT",
      "player",
      JSON.stringify(data),
      (updated) => {
        setSaving(false);
        onSaved(updated);
      },
      (response) => {
        setSaving(false);
        if (response.status === 400) {
          toast(response.message);
        } else {
          onAuthFail(response.message);
        }
      }
    );
  }

  return (
    <Stack spacing={2}>
      <TextField
        label={texts.NAME_PLACEHOLDER}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={saving}
        fullWidth
      />
      <TextField
        label={texts.EMAIL_PLACEHOLDER}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        helperText={texts.EMAIL_IS_LOGIN}
        disabled={saving}
        fullWidth
      />
      <TextField
        label={texts.PHONE_PLACEHOLDER}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={saving}
        fullWidth
      />
      <Button variant="contained" onClick={save} disabled={saving}>
        {saving ? <CircularProgress size={22} /> : texts.SAVE}
      </Button>
    </Stack>
  );
}

function ChangePasswordForm({ onSaved, onAuthFail }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  // The new password is typed twice and must match before anything is sent, so
  // a typo is caught here instead of silently setting an unknown password.
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  // A mismatch only counts once something has been typed into the confirm box.
  const mismatch = confirm.length > 0 && next !== confirm;

  function save() {
    if (!current || !next || !confirm) return;
    if (next !== confirm) {
      toast(texts.PASSWORD_MISMATCH);
      return;
    }
    if (next.length < 8) {
      toast(texts.PASSWORD_TOO_SHORT);
      return;
    }
    setSaving(true);
    accessAPI(
      "PUT",
      "player/password",
      JSON.stringify({ password: current, newPassword: next }),
      () => {
        setSaving(false);
        onSaved();
      },
      (response) => {
        setSaving(false);
        if (response.status === 400) {
          toast(response.message);
        } else {
          onAuthFail(response.message);
        }
      }
    );
  }

  return (
    <Stack spacing={2}>
      <TextField
        label={texts.CURRENT_PASSWORD}
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        disabled={saving}
        fullWidth
      />
      <TextField
        label={texts.NEW_PASSWORD}
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        disabled={saving}
        fullWidth
      />
      <TextField
        label={texts.CONFIRM_PASSWORD}
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={mismatch}
        helperText={mismatch ? texts.PASSWORD_MISMATCH : ""}
        disabled={saving}
        fullWidth
      />
      <Button
        variant="contained"
        onClick={save}
        disabled={saving || !current || !next || !confirm || mismatch}
      >
        {saving ? <CircularProgress size={22} /> : texts.SAVE}
      </Button>
    </Stack>
  );
}
