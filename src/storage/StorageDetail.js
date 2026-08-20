import React, { useState, useEffect, useCallback } from "react";
import { toast } from "../utils/toast";
import { useParams, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
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
                  ? [{ label: texts.ADD_CARD, onClick: () => setAdding(true) }]
                  : []
              }
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
