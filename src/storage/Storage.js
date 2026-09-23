import React, { useState, useEffect, useRef } from "react";
import { toast } from "../utils/toast";
import { confirmDialog } from "../utils/confirm";
import { Link, useNavigate } from "react-router-dom";
import Header from "../header/Header";
import Title from "../elementos/Title";
import SideForm from "../elementos/SideForm";
import Loader from "../loader/Loader";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import "./storage.css";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Typography from "@mui/material/Typography";

const TYPE_LABELS = {
  binder: texts.BINDER,
  sorted_box: texts.SORTED_BOX,
  unsorted_box: texts.UNSORTED_BOX,
  edition_box: texts.EDITION_BOX,
};

// The label for a move depends on where it starts, not just where it lands:
// retired -> for_sale is cancelling a retirement, returning -> for_sale is
// taking delivery. The API decides which moves are offered (`cando`); this only
// names them.
function moveLabel(from, to) {
  // The shop taking its own container off the shelf, or putting it back.
  if (to === "off_sale") return texts.DO_OFF_SALE;
  if (to === "released") {
    // From for_sale this is the shop handing a binder back over the counter
    // without the customer having asked first — a different action from
    // completing a retirement they requested, and worth a different word.
    return from === "for_sale" ? texts.DO_RETURN_TO_OWNER : texts.DO_RELEASE;
  }
  if (to === "for_sale") {
    if (from === "off_sale") return texts.DO_BACK_ON_SALE;
    return from === "retired" ? texts.DO_CANCEL_RETIRE : texts.DO_ACCEPT;
  }
  return to;
}

// The lists, in the order the shop thinks about them: what is on the shelf
// selling; what an owner asked back (retired — still physically behind the
// counter, waiting to be collected, which is why those rows still offer
// actions); what a customer is bringing in; and what is out of the shop's
// hands entirely. Grouping replaces the per-row state chip: the heading says
// it once.
const SECTIONS = [
  { key: "active", title: texts.STORAGE_ACTIVE, states: ["for_sale"] },
  { key: "off_sale", title: texts.STORAGE_OFF_SALE_LIST, states: ["off_sale"] },
  { key: "retired", title: texts.STORAGE_RETIRED_LIST, states: ["retired"] },
  { key: "incoming", title: texts.STORAGE_INCOMING, states: ["returning"] },
  { key: "away", title: texts.STORAGE_AWAY, states: ["released"] },
];

export default function Storage() {
  const [loader, setLoader] = useState(true);
  const [units, setUnits] = useState([]);
  const [total, setTotal] = useState(0);
  // Search, sort and paging all live server-side: a wall of binders should
  // not travel whole on every visit.
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("name");
  const [dir, setDir] = useState("asc");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  // The sidebar: null, {mode:"create"} or {mode:"edit", unit}.
  const [panel, setPanel] = useState(null);
  // The open per-row actions menu: {anchor, unit} or null.
  const [menu, setMenu] = useState(null);
  // Customers, for the owner picker in the edit form. Fetched once.
  const [customers, setCustomers] = useState([]);
  // The owner chosen in the edit form's autocomplete: an option object
  // { id: "shop" | <playerid>, label }.
  const [ownerOption, setOwnerOption] = useState(null);
  // Whether the container being edited shows up in the storefront's browse
  // section. In state because it is a switch, and the form has to re-render
  // when it is flipped.
  const [browsable, setBrowsable] = useState(true);
  // The create form's type, in state rather than on a ref: an edition box
  // needs a set picked too, so the form has to re-render when the type
  // changes.
  const [newType, setNewType] = useState("binder");
  // Every paper set, for that picker. Fetched once, and only when an edition
  // box is actually being created — it is a long list nothing else needs.
  const [sets, setSets] = useState([]);
  const [setOption, setSetOption] = useState(null);

  const nameRef = useRef(null);

  const navigate = useNavigate();

  function bail(response) {
    toast(response.message);
    logout();
    navigate("/login");
  }

  function load() {
    accessAPI(
      "GET",
      `storage?page=${page + 1}&limit=${limit}&sort=${sort}&dir=${dir}` +
        (q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""),
      null,
      (response) => {
        setUnits(response.units ?? []);
        setTotal(response.total ?? 0);
        setLoader(false);
      },
      bail
    );
  }

  // Typing searches after a pause, not per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, dir, page, limit]);

  // The customer roster for the owner picker — clients only; the shop is a
  // separate option in the form.
  useEffect(() => {
    accessAPI(
      "GET",
      "admin/player",
      null,
      (response) =>
        setCustomers(
          (response ?? []).filter((p) => p.role === "customer")
        ),
      () => setCustomers([])
    );
  }, []);

  // The set roster, fetched the first time an edition box is being created:
  // it is every paper set ever printed, and no other form needs it.
  useEffect(() => {
    if (newType !== "edition_box" || sets.length) return;
    accessAPI(
      "GET",
      "card/sets",
      null,
      (response) => setSets(response ?? []),
      () => setSets([])
    );
  }, [newType, sets.length]);

  // Seed the owner autocomplete when the edit form opens: the container's
  // current owner, or the shop. (Matched to the roster option by id, so the
  // name-only seed still highlights the right customer once picked.)
  useEffect(() => {
    if (panel?.mode !== "edit") return;
    setOwnerOption(
      panel.unit.owner
        ? { id: panel.unit.owner.id, label: panel.unit.owner.name }
        : { id: "shop", label: texts.STORAGE_OWNER_SHOP }
    );
    setBrowsable(panel.unit.browsable !== false);
  }, [panel]);

  // A fresh create form every time: the last type picked should not decide
  // the next container, and a leftover set would silently attach itself.
  useEffect(() => {
    if (panel?.mode !== "create") return;
    setNewType("binder");
    setSetOption(null);
  }, [panel]);

  function toggleSort(column) {
    if (sort === column) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(column);
      setDir("asc");
    }
    setPage(0);
  }

  // Always the shop's own furniture — a customer's container is created by
  // the customer from their app, and arrives here by being brought in.
  function createUnit(e) {
    e.preventDefault();
    const name = nameRef.current.value.trim();
    if (!name) return;
    // An edition box is the set it holds, so it cannot be created without
    // one. The API refuses it too; this just keeps the form from asking.
    if (newType === "edition_box" && !setOption) return;
    accessAPI(
      "POST",
      "storage",
      {
        name,
        type: newType,
        ...(newType === "edition_box" ? { cardset: setOption.id } : {}),
      },
      () => {
        setPanel(null);
        load();
      },
      (response) => toast(response.message)
    );
  }

  // Edit a container's store label and/or its owner. Reassigning the owner
  // re-homes every card inside into the new owner's collection (the API does
  // this atomically), so who gets paid on a sale follows the container.
  function editUnit(e) {
    e.preventDefault();
    const name = nameRef.current.value.trim();
    if (!name) return;
    // "shop" is the sentinel for the store owning it (playerid null).
    const owner = ownerOption?.id ?? "shop";
    accessAPI(
      "PUT",
      `storage/${panel.unit.id}`,
      {
        name,
        owner: owner === "shop" ? null : parseInt(owner, 10),
        browsable,
      },
      () => {
        setPanel(null);
        load();
      },
      (response) => toast(response.message)
    );
  }

  // Hand a customer's container along its lifecycle. Releasing it is the only
  // move with a consequence worth reporting: copies already promised to a buyer
  // stay behind on the counter, so whoever hands the binder over has to know
  // not to put them in it.
  function move(unit, to) {
    accessAPI(
      "POST",
      `storage/${unit.id}/state`,
      { state: to },
      (response) => {
        if (to === "released") {
          const held = response.heldback || [];
          // A plain confirmation — unless copies promised to a buyer stay
          // behind, which whoever hands the binder over has to know.
          if (held.length) {
            toast(
              `${texts.STORAGE_RETURNED} ${texts.HELD_BACK}\n` +
                held.map((c) => `- ${c.name} (#${c.copyindex})`).join("\n"),
              "warning"
            );
          } else {
            toast(texts.STORAGE_RETURNED, "success");
          }
        }
        load();
      },
      (response) => toast(response.message)
    );
  }

  async function removeUnit(unit) {
    if (!(await confirmDialog(texts.CONFIRM_DELETE_STORAGE))) return;
    // A container with cards inside takes them with it — a second, explicit
    // confirmation, and `withCards` so the API only does it when asked.
    const withCards = unit.cardcount > 0;
    if (
      withCards &&
      !(await confirmDialog(
        `${texts.CONFIRM_DELETE_STORAGE_CARDS_1}${unit.cardcount}${texts.CONFIRM_DELETE_STORAGE_CARDS_2}`
      ))
    ) {
      return;
    }
    accessAPI(
      "DELETE",
      `storage/${unit.id}`,
      withCards ? { withCards: true } : null,
      () => load(),
      (response) => toast(response.message)
    );
  }

  // Receiving a delivery is the everyday action, so it gets its own button on
  // the row instead of hiding behind the three dots with the rare moves.
  function isReceive(unit, to) {
    return unit.state === "returning" && to === "for_sale";
  }

  // Every SECONDARY action a row offers, in one flat list for its menu. The
  // API already decided what is possible (`cando`, `deletable`, released =
  // hands off); this only presents it.
  function actionsFor(unit) {
    const actions = [];
    if (unit.inshop !== false) {
      actions.push({
        label: texts.EDIT,
        run: () => setPanel({ mode: "edit", unit }),
      });
    }
    for (const to of unit.cando || []) {
      if (isReceive(unit, to)) continue;
      actions.push({
        label: moveLabel(unit.state, to),
        run: () => move(unit, to),
      });
    }
    if (unit.deletable) {
      actions.push({
        label: texts.DELETE,
        color: "error.main",
        run: () => removeUnit(unit),
      });
    }
    return actions;
  }

  function section(title, rows) {
    if (!rows.length) return null;
    return (
      <div key={title}>
        <Typography variant="subtitle1" sx={{ mt: 3, mb: 0.5, fontWeight: 700 }}>
          {title}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sortDirection={sort === "name" ? dir : false}>
                  <TableSortLabel
                    active={sort === "name"}
                    direction={sort === "name" ? dir : "asc"}
                    onClick={() => toggleSort("name")}
                  >
                    {texts.COL_CONTAINER}
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{ width: 220 }}
                  sortDirection={sort === "owner" ? dir : false}
                >
                  <TableSortLabel
                    active={sort === "owner"}
                    direction={sort === "owner" ? dir : "asc"}
                    onClick={() => toggleSort("owner")}
                  >
                    {texts.COL_OWNER}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: 260 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((unit) => (
                <TableRow key={unit.id} hover>
                  <TableCell>
                    <Link to={`/storage/${unit.id}`} className="storageName">
                      {unit.name}
                    </Link>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {TYPE_LABELS[unit.type]}
                      {/* Which set, for a box that is one — two identically
                          named edition boxes are otherwise indistinguishable
                          from the list. */}
                      {unit.cardsetname ? ` · ${unit.cardsetname}` : ""}
                      {/* Said on the row rather than only in the edit form:
                          "why is this binder not in the shop?" should be
                          answerable without opening anything. */}
                      {unit.browsable === false
                        ? ` · ${texts.STORAGE_NOT_BROWSABLE}`
                        : ""}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ width: 220 }}>
                    {unit.owner ? unit.owner.name : texts.SHOP}
                  </TableCell>
                  <TableCell align="right" sx={{ width: 260, whiteSpace: "nowrap" }}>
                    {(unit.cando || []).some((to) => isReceive(unit, to)) && (
                      <Button
                        size="small"
                        sx={{ mr: 1 }}
                        onClick={() => move(unit, "for_sale")}
                      >
                        {texts.DO_ACCEPT}
                      </Button>
                    )}
                    {actionsFor(unit).length > 0 && (
                      <IconButton
                        size="small"
                        aria-label={texts.ACTIONS}
                        onClick={(e) =>
                          setMenu({ anchor: e.currentTarget, unit })
                        }
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      {loader && <Loader color="blue" />}
      {!loader && (
        <div className="content">
          <Title
            title={texts.STORAGE_TITLE}
            buttons={[
              {
                label: texts.NEW_STORAGE,
                onClick: () => setPanel({ mode: "create" }),
              },
            ]}
          />

          <TextField
            size="small"
            placeholder={texts.STORAGE_SEARCH}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            sx={{ mb: 1, width: 320, maxWidth: "100%" }}
          />

          {!units.length && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              {q ? texts.STORAGE_NO_MATCHES : texts.NO_CONTAINERS}
            </Typography>
          )}
          {SECTIONS.map(({ title, states }) =>
            section(
              title,
              units.filter((u) => states.includes(u.state))
            )
          )}

          {total > limit && (
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, next) => setPage(next)}
              rowsPerPage={limit}
              onRowsPerPageChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage={texts.PER_PAGE}
            />
          )}
        </div>
      )}

      {/* One menu for whichever row opened it, so a hundred rows do not mount
          a hundred menus. */}
      <Menu
        anchorEl={menu?.anchor}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        // Without this MUI locks body scroll and pads the page to fake the
        // gone scrollbar, shoving everything left with a margin on the right
        // while the kebab is open.
        disableScrollLock
      >
        {menu &&
          actionsFor(menu.unit).map((action) => (
            <MenuItem
              key={action.label}
              sx={action.color ? { color: action.color } : undefined}
              onClick={() => {
                setMenu(null);
                action.run();
              }}
            >
              {action.label}
            </MenuItem>
          ))}
      </Menu>

      {/* The create and rename forms share the sidebar: both are "a small
          form that should not live in the middle of the list". */}
      <SideForm
        open={Boolean(panel)}
        onClose={() => setPanel(null)}
        title={panel?.mode === "edit" ? texts.EDIT_STORAGE : texts.NEW_STORAGE}
      >
        {panel?.mode === "create" && (
          <form onSubmit={createUnit}>
            <Stack spacing={2}>
              <TextField
                type="text"
                label={texts.STORAGE_NAME}
                inputRef={nameRef}
                autoFocus
              />
              <TextField select SelectProps={{ native: true }}
                label={texts.STORAGE_TYPE}
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                <option value="binder">{texts.BINDER}</option>
                <option value="sorted_box">{texts.SORTED_BOX}</option>
                <option value="unsorted_box">{texts.UNSORTED_BOX}</option>
                <option value="edition_box">{texts.EDITION_BOX}</option>
              </TextField>
              {/* An edition box IS a set, so it is picked here and never
                  again — the field only exists for this one type. */}
              {newType === "edition_box" && (
                <Autocomplete
                  options={sets.map((set) => ({
                    id: set.cardset,
                    label: `${set.cardsetname} (${set.cardset.toUpperCase()})`,
                  }))}
                  value={setOption}
                  onChange={(e, value) => setSetOption(value)}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  getOptionLabel={(opt) => opt.label ?? ""}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={texts.EDITION_SET}
                      helperText={texts.EDITION_SET_HINT}
                    />
                  )}
                />
              )}
              <Button
                type="submit"
                disabled={newType === "edition_box" && !setOption}
              >
                {texts.CREATE}
              </Button>
            </Stack>
          </form>
        )}
        {panel?.mode === "edit" && (
          <form onSubmit={editUnit}>
            <Stack spacing={2}>
              <TextField
                type="text"
                label={texts.STORAGE_NAME}
                inputRef={nameRef}
                defaultValue={panel.unit.name}
                autoFocus
              />
              {/* Type to filter the roster instead of scrolling a dropdown.
                  "Tienda" is the first option (the shop owning it). */}
              <Autocomplete
                options={[
                  { id: "shop", label: texts.STORAGE_OWNER_SHOP },
                  ...customers.map((c) => ({
                    id: c.id,
                    label: `${c.name} (${c.email})`,
                  })),
                ]}
                value={ownerOption}
                onChange={(e, value) => setOwnerOption(value)}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                getOptionLabel={(opt) => opt.label ?? ""}
                disableClearable
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={texts.STORAGE_OWNER}
                    helperText={texts.STORAGE_OWNER_HINT}
                  />
                )}
              />
              {/* About the CONTAINER, not its cards: turning it off hides the
                  binder from the browse shelf and takes nothing off sale. */}
              <FormControlLabel
                control={
                  <Switch
                    checked={browsable}
                    onChange={(e) => setBrowsable(e.target.checked)}
                  />
                }
                label={texts.STORAGE_BROWSABLE}
              />
              <Typography variant="caption" color="text.secondary">
                {texts.STORAGE_BROWSABLE_HINT}
              </Typography>
              <Button type="submit">{texts.SAVE}</Button>
            </Stack>
          </form>
        )}
      </SideForm>
    </div>
  );
}
