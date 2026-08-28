import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "../utils/toast";
import { useParams, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Header from "../header/Header";
import Title from "../elementos/Title";
import SideForm from "../elementos/SideForm";
import AddCardPanel from "./AddCardPanel";
import Loader from "../loader/Loader";
import texts from "../data/texts";
import { accessAPI, logout } from "../utils/fetchFunctions";
import BinderEditor from "./BinderEditor";
import BoxEditor from "./BoxEditor";

const TYPE_LABELS = {
  binder: texts.BINDER,
  sorted_box: texts.SORTED_BOX,
  unsorted_box: texts.UNSORTED_BOX,
};

const STATE_LABELS = {
  for_sale: texts.STATE_FOR_SALE,
  retired: texts.STATE_RETIRED,
  released: texts.STATE_RELEASED,
  returning: texts.STATE_RETURNING,
};

// One container, opened — the shop's view, same editors as the customer's.
//
// EVERY container opens: a binder is pages of pockets, a sorted box is an
// ordered list, an unsorted box an alphabetical one. Editing is what is gated
// (`unit.editable`, from the API): the store adds, removes and sorts cards
// only in its OWN furniture. A customer's container is displayed and sold
// from, never restocked or reorganized behind their back — every change to
// their cards goes through a flow they see: a sale, a withdrawal, a return.
export default function StorageDetail() {
  const { storageId } = useParams();
  const navigate = useNavigate();
  const [loader, setLoader] = useState(true);
  const [unit, setUnit] = useState(null);
  const [leaving, setLeaving] = useState(false);
  // Whether the add-a-card sidebar is slid out.
  const [adding, setAdding] = useState(false);
  // The hidden file input behind the "Importar de ManaBox" Title button.
  const importRef = useRef(null);
  // True from the moment a file is picked until the API answers — a scan of
  // a full binder takes a few seconds, and a page that says nothing reads
  // as a click that did nothing.
  const [importing, setImporting] = useState(false);

  // Read the picked CSV and hand it to the API, which maps rows to pockets
  // (empty lines skip one) and keeps the scan's condition and language.
  async function importManaBox(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !unit) return;
    setImporting(true);
    const csv = await file.text();
    accessAPI(
      "POST",
      `storage/${unit.id}/import`,
      { csv },
      (result) => {
        setImporting(false);
        let message = `${result.added}${texts.IMPORT_DONE_CARDS}`;
        if (result.skipped > 0)
          message += ` · ${result.skipped}${texts.IMPORT_SKIPPED}`;
        if (result.errors.length > 0)
          message += ` · ${result.errors.length}${texts.IMPORT_ERRORS}`;
        toast(message, result.errors.length ? undefined : "success");
        load();
      },
      (response) => {
        setImporting(false);
        toast(response.message);
      },
      // A big scan legitimately takes a while — the default timeout would
      // declare failure while the server is still happily importing.
      { timeout: 180000 }
    );
  }

  const load = useCallback(() => {
    accessAPI(
      "GET",
      `storage/${storageId}`,
      null,
      (response) => {
        setUnit(response);
        setLoader(false);
      },
      (response) => {
        toast(response.message);
        if (response.status === 401) {
          logout();
          navigate("/login");
        } else {
          navigate("/storage");
        }
      }
    );
  }, [storageId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Every mutation re-reads the container rather than patching state in place.
  // Depths, sequences and stack membership all shift when a card moves, and
  // guessing the new arrangement client-side is how a view starts disagreeing
  // with what is actually stored.
  const after = (response) => load();
  const onError = (response) => toast(response.message);

  const move = (placementid, position) =>
    accessAPI(
      "PUT",
      `storage/placement/${placementid}/position`,
      position,
      after,
      onError
    );

  const duplicate = (placementid) =>
    accessAPI(
      "POST",
      `storage/placement/${placementid}/duplicate`,
      null,
      after,
      onError
    );

  // Shift every card on one binder page a pocket ahead or back; the edge
  // stack is kicked to the stand-by area by the API.
  // Reorder the stack inside one pocket — the dialog sends the whole new
  // order, front (visible) card first.
  const reorderPocket = (page, pocket, placementids) =>
    accessAPI(
      "PUT",
      `storage/${unit.id}/pocket/order`,
      { page, pocket, placementids },
      after,
      onError
    );

  const shiftPage = (page, frompocket, direction) =>
    accessAPI(
      "POST",
      `storage/${unit.id}/page/${page}/shift`,
      { frompocket, direction },
      after,
      onError
    );

  const remove = (placementid) =>
    accessAPI(
      "DELETE",
      `storage/placement/${placementid}`,
      null,
      after,
      onError
    );

  const reorder = (placementids) =>
    accessAPI(
      "PUT",
      `storage/${storageId}/order`,
      { placementids },
      after,
      onError
    );

  const standbyCount = unit?.standby?.length ?? 0;

  // Leaving with cards still in stand-by throws them away — a card with nowhere
  // to live is exactly what this model does not allow. Warned about first,
  // because it is destructive and not obvious.
  function leave() {
    if (unit?.arrangeable && standbyCount > 0) {
      setLeaving(true);
      return;
    }
    navigate("/storage");
  }

  function discardAndLeave() {
    accessAPI(
      "POST",
      `storage/${storageId}/discard-standby`,
      null,
      () => navigate("/storage"),
      (response) => {
        setLeaving(false);
        toast(response.message);
      }
    );
  }

  return (
    <div>
      <Header showMenu={true} loggedIn={true} />
      <div className="content">
        {loader && <Loader color="blue" />}
        {!loader && unit && (
          <>
            <Title
              // Through leave(), not a bare navigate: the stand-by discard
              // warning has to fire from the arrow too.
              onBack={leave}
              title={unit.name}
              subtitle={`${unit.cardcount} ${texts.CARDS}`}
              tags={[
                TYPE_LABELS[unit.type],
                unit.owner ? unit.owner.name : texts.SHOP,
                {
                  label: STATE_LABELS[unit.state],
                  color: unit.forsale ? "success" : undefined,
                },
              ]}
              buttons={
                // Adding follows physical possession, like arranging: a
                // customer walking in with more cards for their consigned
                // binder hands them over the counter.
                unit.arrangeable
                  ? [
                      { label: texts.ADD_CARD, onClick: () => setAdding(true) },
                      {
                        label: texts.IMPORT_MANABOX,
                        onClick: () => !importing && importRef.current?.click(),
                      },
                    ]
                  : []
              }
            />

            {/* Working, said out loud: the import processes card by card
                and a big scan takes seconds. */}
            {importing && (
              <Alert
                icon={<CircularProgress size={18} />}
                severity="info"
                sx={{ mb: 2 }}
              >
                {texts.IMPORTING_MANABOX}
              </Alert>
            )}

            {/* The ManaBox button is a file picker: the browse dialog IS the
                interaction, so the input hides and the Title button clicks
                it. Resetting value lets the same file be picked twice. */}
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={importManaBox}
            />

            {/* Says why controls are absent, rather than leaving them to be
                puzzled over. A customer's container in the shop's hands can be
                rearranged but not restocked; one in the customer's hands is
                untouchable. */}
            {!unit.arrangeable && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {texts.STORAGE_LOCKED}
              </Alert>
            )}
            {unit.arrangeable && !unit.editable && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {texts.STORAGE_ARRANGE_ONLY}
              </Alert>
            )}

            {unit.type === "binder" ? (
              <BinderEditor
                unit={unit}
                arrange={unit.arrangeable}
                mutate={unit.editable}
                withdrawable={false}
                onMove={move}
                onDuplicate={duplicate}
                onRemove={remove}
                onShiftPage={shiftPage}
                onReorderPocket={reorderPocket}
              />
            ) : (
              <>
                {!unit.cards?.length && (
                  <Alert severity="info">{texts.CONTAINER_EMPTY}</Alert>
                )}
                {unit.type === "unsorted_box" && unit.cards?.length > 0 && (
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    {texts.UNSORTED_HINT}
                  </Alert>
                )}
                <BoxEditor
                  unit={unit}
                  arrange={unit.arrangeable}
                  mutate={unit.editable}
                  withdrawable={false}
                  onRemove={remove}
                  onReorder={reorder}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Adding stays open across adds: filling a container is a run of
          them, and every add re-reads the container so the page behind is
          already current when the sidebar closes. */}
      {unit && (
        <SideForm
          open={adding}
          onClose={() => setAdding(false)}
          title={texts.ADD_CARD}
          width={720}
        >
          <AddCardPanel unit={unit} onAdded={load} />
        </SideForm>
      )}

      <Dialog open={leaving} onClose={() => setLeaving(false)}>
        <DialogTitle>{texts.STANDBY_DISCARD_TITLE}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {texts.STANDBY_DISCARD_1}
            {standbyCount}
            {texts.STANDBY_DISCARD_2}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setLeaving(false)}>
            {texts.STANDBY_KEEP_EDITING}
          </Button>
          <Button color="error" onClick={discardAndLeave}>
            {texts.STANDBY_DISCARD_CONFIRM}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
