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
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

const TYPE_LABELS = {
  binder: texts.BINDER,
  sorted_box: texts.SORTED_BOX,
  unsorted_box: texts.UNSORTED_BOX,
};

// The label for a move depends on where it starts, not just where it lands:
// retired -> for_sale is cancelling a retirement, returning -> for_sale is
// taking delivery. The API decides which moves are offered (`cando`); this only
// names them.
function moveLabel(from, to) {
  if (to === "released") {
    // From for_sale this is the shop handing a binder back over the counter
    // without the customer having asked first — a different action from
    // completing a retirement they requested, and worth a different word.
    return from === "for_sale" ? texts.DO_RETURN_TO_OWNER : texts.DO_RELEASE;
  }
  if (to === "for_sale") {
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
  // The sidebar: null, {mode:"create"} or {mode:"rename", unit}.
  const [panel, setPanel] = useState(null);
  // The open per-row actions menu: {anchor, unit} or null.
  const [menu, setMenu] = useState(null);

  const nameRef = useRef(null);
  const typeRef = useRef(null);

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
    accessAPI(
      "POST",
      "storage",
      { name, type: typeRef.current.value },
      () => {
        setPanel(null);
        load();
      },
      (response) => toast(response.message)
    );
  }

  function renameUnit(e) {
    e.preventDefault();
    const name = nameRef.current.value.trim();
    if (!name) return;
    accessAPI(
      "PUT",
      `storage/${panel.unit.id}`,
      { name },
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
    accessAPI(
      "DELETE",
      `storage/${unit.id}`,
      null,
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
        label: texts.RENAME,
        run: () => setPanel({ mode: "rename", unit }),
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
        title={panel?.mode === "rename" ? texts.RENAME : texts.NEW_STORAGE}
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
                inputRef={typeRef}
                defaultValue="binder"
              >
                <option value="binder">{texts.BINDER}</option>
                <option value="sorted_box">{texts.SORTED_BOX}</option>
                <option value="unsorted_box">{texts.UNSORTED_BOX}</option>
              </TextField>
              <Button type="submit">{texts.CREATE}</Button>
            </Stack>
          </form>
        )}
        {panel?.mode === "rename" && (
          <form onSubmit={renameUnit}>
            <Stack spacing={2}>
              <TextField
                type="text"
                label={texts.STORAGE_NAME}
                inputRef={nameRef}
                defaultValue={panel.unit.name}
                autoFocus
              />
              <Button type="submit">{texts.SAVE}</Button>
            </Stack>
          </form>
        )}
      </SideForm>
    </div>
  );
}
