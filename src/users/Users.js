import React, { useState, useEffect } from "react";
import { toast } from "../utils/toast";
import Header from "../header/Header";
import Title from "../elementos/Title";
import Loader from "../loader/Loader";
import SideForm from "../elementos/SideForm";
import { useNavigate } from "react-router-dom";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import {
  useExchangeRate,
  formatPesos,
  pesosFrozenOrLive,
} from "../utils/exchange";
import "./users.css";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// A customer's store credit is stored in dollars; the whole client-facing side
// is pesos, so show it converted at today's rate (dollars only if there is no
// rate).
const creditPesos = (dollars, rate) => {
  if (dollars == null) return "—";
  return rate != null
    ? formatPesos(Math.round(Number(dollars) * rate))
    : `U$S ${dollars}`;
};

// One searchable, paginated table of accounts, entirely from the MUI kit. Each
// row has a kebab: Editar always, and Ajustar crédito for customers.
function UserTable({
  title,
  rows,
  showCredit,
  rate,
  onEdit,
  onAdjustCredit,
  onHistory,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [menu, setMenu] = useState(null); // { anchor, player }

  const term = search.trim().toLowerCase();
  const filtered = term
    ? rows.filter(
        (p) =>
          (p.name ?? "").toLowerCase().includes(term) ||
          (p.email ?? "").toLowerCase().includes(term)
      )
    : rows;
  const start = page * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  // A search that empties the current page should not strand the user past the
  // end of the results.
  useEffect(() => {
    setPage(0);
  }, [term, rows.length]);

  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 1 }}
      >
        <Typography variant="h6">{title}</Typography>
        <TextField
          size="small"
          label={texts.USERS_SEARCH}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{texts.FULL_NAME}</TableCell>
              <TableCell>{texts.COL_ACCOUNT}</TableCell>
              <TableCell>{texts.COL_PHONE}</TableCell>
              {showCredit ? (
                <TableCell align="right">{texts.COL_CREDIT}</TableCell>
              ) : (
                <TableCell>{texts.COL_ROLE}</TableCell>
              )}
              <TableCell padding="checkbox" />
            </TableRow>
          </TableHead>
          <TableBody>
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={5} sx={{ color: "text.secondary" }}>
                  {rows.length ? texts.USERS_NONE_MATCH : texts.USERS_EMPTY}
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((player) => (
              <TableRow key={player.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{player.name}</TableCell>
                <TableCell sx={{ color: "text.secondary" }}>
                  {player.email}
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>
                  {player.phone || "—"}
                </TableCell>
                {showCredit ? (
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {creditPesos(player.credit, rate)}
                  </TableCell>
                ) : (
                  <TableCell>
                    <Chip
                      size="small"
                      label={texts[`ROLE_${player.role}`] ?? player.role}
                      color={player.role === "owner" ? "primary" : "default"}
                    />
                  </TableCell>
                )}
                <TableCell padding="checkbox">
                  <IconButton
                    size="small"
                    onClick={(e) =>
                      setMenu({ anchor: e.currentTarget, player })
                    }
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(e, next) => setPage(next)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage={texts.ROWS_PER_PAGE}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} ${texts.OF} ${count}`
        }
      />

      <Menu
        anchorEl={menu?.anchor}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        // A row kebab is small and closes on its own; without this MUI locks
        // body scroll and pads the page to fake the gone scrollbar, which
        // shoves everything left with a margin on the right while it is open.
        disableScrollLock
      >
        <MenuItem
          onClick={() => {
            const p = menu.player;
            setMenu(null);
            onEdit(p);
          }}
        >
          {texts.EDIT}
        </MenuItem>
        {showCredit && (
          <MenuItem
            onClick={() => {
              const p = menu.player;
              setMenu(null);
              onAdjustCredit(p);
            }}
          >
            {texts.ADJUST_CREDIT}
          </MenuItem>
        )}
        {/* History lives on clients only for now (Federico's call) — where the
            purchases/sales/credit activity actually is. */}
        {showCredit && (
          <MenuItem
            onClick={() => {
              const p = menu.player;
              setMenu(null);
              onHistory(p);
            }}
          >
            {texts.VIEW_HISTORY}
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

// Owner-only: the shop's accounts, split into administrators and clients, with
// each client's store credit. Editing (name + phone) and credit adjustments
// open a sidebar.
export default function Users() {
  const [loader, setLoader] = useState(true);
  const [players, setPlayers] = useState([]);
  const rate = useExchangeRate();

  // The open sidebar, if any: an account being edited, or one whose credit is
  // being adjusted.
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);

  const navigate = useNavigate();

  function load() {
    accessAPI(
      "GET",
      "admin/player",
      null,
      (response) => {
        setPlayers(response ?? []);
        setLoader(false);
      },
      (response) => {
        // A staff member reaching this page gets the same 403 the API gives.
        toast(response.message);
        navigate("/home");
      }
    );
  }

  useEffect(() => {
    accessAPI("GET", "admin/me", null, () => {}, () => {
      logout();
      navigate("/login");
    });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const admins = players.filter((p) => p.role !== "customer");
  const clients = players.filter((p) => p.role === "customer");

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      {loader && <Loader color="blue" />}
      {!loader && (
        <div className="content">
          <Title title={texts.USERS_TITLE} />

          <UserTable
            title={texts.USERS_ADMINS}
            rows={admins}
            showCredit={false}
            rate={rate}
            onEdit={setEditing}
            onAdjustCredit={setAdjusting}
            onHistory={setViewingHistory}
          />
          <UserTable
            title={texts.USERS_CLIENTS}
            rows={clients}
            showCredit={true}
            rate={rate}
            onEdit={setEditing}
            onAdjustCredit={setAdjusting}
            onHistory={setViewingHistory}
          />
        </div>
      )}

      <SideForm
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={texts.EDIT_USER}
      >
        {editing && (
          <EditUserForm
            player={editing}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </SideForm>

      <SideForm
        open={Boolean(adjusting)}
        onClose={() => setAdjusting(null)}
        title={texts.ADJUST_CREDIT}
      >
        {adjusting && (
          <AdjustCreditForm
            player={adjusting}
            rate={rate}
            onSaved={() => {
              setAdjusting(null);
              load();
            }}
          />
        )}
      </SideForm>

      {/* Wider, because a history line carries a date, a description and an
          amount and should not wrap. */}
      <SideForm
        open={Boolean(viewingHistory)}
        onClose={() => setViewingHistory(null)}
        title={texts.HISTORY_TITLE}
        width={620}
      >
        {viewingHistory && (
          <HistorySidebar player={viewingHistory} rate={rate} />
        )}
      </SideForm>
    </div>
  );
}

// Formats a unix-seconds timestamp as dd/mm/yyyy.
function histDate(seconds) {
  const d = new Date(seconds * 1000);
  return (
    String(d.getDate()).padStart(2, "0") +
    "/" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "/" +
    d.getFullYear()
  );
}

// One account's activity, newest first: purchases, sales and store-credit
// changes. All amounts show in pesos.
function HistorySidebar({ player, rate }) {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    accessAPI(
      "GET",
      `admin/player/${player.id}/history`,
      null,
      (response) => setEvents(response.events ?? []),
      () => setEvents([])
    );
  }, [player.id]);

  if (events === null) {
    return (
      <Box sx={{ textAlign: "center", py: 3 }}>
        <CircularProgress size={22} />
      </Box>
    );
  }
  if (!events.length) {
    return (
      <Typography color="text.secondary">{texts.HISTORY_EMPTY}</Typography>
    );
  }

  return (
    <Stack spacing={1.25} divider={<Divider flexItem />}>
      <Typography variant="subtitle1">{player.name}</Typography>
      {events.map((e, i) => (
        <HistoryRow key={i} event={e} rate={rate} />
      ))}
    </Stack>
  );
}

function HistoryRow({ event, rate }) {
  let label;
  let color;
  let description;
  let amount;
  // For a purchase paid partly with store credit: two lines, efectivo + crédito.
  let amountLines = null;

  if (event.type === "purchase") {
    label = texts.HIST_PURCHASE;
    color = "default";
    const items = event.items ?? [];
    const shown = items
      .slice(0, 2)
      .map((it) => `${it.quantity > 1 ? `${it.quantity}× ` : ""}${it.name}`)
      .join(", ");
    const extra = items.length > 2 ? ` +${items.length - 2} ${texts.HIST_MORE}` : "";
    description = shown + extra;
    amount = pesosFrozenOrLive(event.total, event.totalpesos, rate);
    // Split cash vs credit when part of the bill was paid with store credit
    // and we can convert to pesos. The total in pesos is the frozen sum (or a
    // live conversion); the credit half is converted live, and cash is the
    // remainder, so the two lines always add back to the total shown.
    const credit = Number(event.creditused) || 0;
    const totalPesos =
      event.totalpesos != null
        ? Number(event.totalpesos)
        : rate != null
        ? Math.round(Number(event.total) * rate)
        : null;
    if (credit > 0 && rate != null && totalPesos != null) {
      const creditP = Math.min(Math.round(credit * rate), totalPesos);
      const cashP = totalPesos - creditP;
      amountLines = [
        `${formatPesos(cashP)} ${texts.HIST_CASH}`,
        `${formatPesos(creditP)} ${texts.HIST_CREDIT_PART}`,
      ];
    }
  } else if (event.type === "sale") {
    label = texts.HIST_SALE;
    color = "success";
    description = `${event.quantity > 1 ? `${event.quantity}× ` : ""}${event.name}${
      event.cardsetcode ? ` (${event.cardsetcode.toUpperCase()})` : ""
    }`;
    amount = creditPesos(event.net, rate);
  } else if (event.type === "payment") {
    // Cash the shop paid the consignor. (Credit spent on a purchase is not a
    // payment event here — it is the crédito line inside its own Compra.)
    label = texts.HIST_PAYOUT;
    color = "info";
    description = "";
    amount = creditPesos(event.amount, rate);
  } else {
    // credit adjustment (manual grant / deduction)
    label = texts.HIST_CREDIT;
    const value = Number(event.amount);
    color = value >= 0 ? "primary" : "warning";
    description = event.note || "";
    const sign = value >= 0 ? "+" : "−";
    amount = `${sign}${creditPesos(Math.abs(value), rate)}`;
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip size="small" label={label} color={color} />
          <Typography variant="caption" color="text.secondary">
            {histDate(event.date)}
          </Typography>
        </Stack>
        {amountLines ? (
          <Stack alignItems="flex-end">
            {amountLines.map((line, i) => (
              <Typography
                key={i}
                variant="body2"
                sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
              >
                {line}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
          >
            {amount}
          </Typography>
        )}
      </Stack>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}

// Edit an account's name and phone. Email is the login identifier and shown
// read-only.
function EditUserForm({ player, onSaved }) {
  const [name, setName] = useState(player.name ?? "");
  const [phone, setPhone] = useState(player.phone ?? "");
  const [saving, setSaving] = useState(false);

  function save() {
    if (!name.trim()) return;
    setSaving(true);
    accessAPI(
      "PUT",
      `admin/player/${player.id}`,
      { name: name.trim(), phone: phone.trim() },
      () => {
        setSaving(false);
        toast(texts.USER_UPDATED_OK, "success");
        onSaved();
      },
      (response) => {
        setSaving(false);
        toast(response.message);
      }
    );
  }

  return (
    <Stack spacing={2}>
      <TextField
        label={texts.FULL_NAME}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <TextField
        label={texts.PHONE}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <TextField
        label={texts.EMAIL_READONLY}
        value={player.email}
        InputProps={{ readOnly: true }}
        disabled
      />
      <Button variant="contained" disabled={saving || !name.trim()} onClick={save}>
        {texts.SAVE}
      </Button>
    </Stack>
  );
}

// Add or subtract a customer's store credit, in pesos. The current balance and
// the resulting balance are shown so the change is never a guess.
function AdjustCreditForm({ player, rate, onSaved }) {
  const [sign, setSign] = useState("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const value = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(value) && value > 0;
  // Preview in pesos: the current credit (converted from dollars) plus/minus
  // the typed pesos, never below zero.
  const currentPesos =
    rate != null ? Math.round(Number(player.credit ?? 0) * rate) : null;
  const delta = sign === "add" ? value : -value;
  const resultPesos =
    currentPesos != null && valid
      ? Math.max(0, currentPesos + delta)
      : null;

  function save() {
    if (!valid) return;
    setSaving(true);
    accessAPI(
      "POST",
      `admin/player/${player.id}/credit`,
      { pesos: delta, note: note.trim() },
      () => {
        setSaving(false);
        toast(texts.CREDIT_ADJUSTED_OK, "success");
        onSaved();
      },
      (response) => {
        setSaving(false);
        toast(response.message);
      }
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">{player.name}</Typography>
      <Typography variant="body2" color="text.secondary">
        {texts.CURRENT_CREDIT}: <strong>{creditPesos(player.credit, rate)}</strong>
      </Typography>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={sign}
        onChange={(e, next) => next && setSign(next)}
      >
        <ToggleButton value="add">{texts.CREDIT_ADD}</ToggleButton>
        <ToggleButton value="subtract">{texts.CREDIT_SUBTRACT}</ToggleButton>
      </ToggleButtonGroup>

      <TextField
        type="number"
        label={texts.CREDIT_AMOUNT}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputProps={{ min: 0, step: 1 }}
        autoFocus
      />
      <TextField
        label={texts.CREDIT_NOTE}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {resultPesos != null && (
        <Typography variant="body2">
          {texts.CREDIT_NEW_TOTAL}: <strong>{formatPesos(resultPesos)}</strong>
        </Typography>
      )}

      <Button variant="contained" disabled={saving || !valid} onClick={save}>
        {texts.SAVE}
      </Button>
    </Stack>
  );
}
