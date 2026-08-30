import { CheckCircle2, Clock3, ArrowRight, XCircle, Pencil, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { TASK_CATEGORIES, taskCatMeta } from "../categories";
import ImagePicker from "./ImagePicker";
import ImageGallery from "./ImageGallery";

const MAX_TITLE_LENGTH = 120;

const STAMP = {
  open: { text: "OPEN", cls: "stamp-open" },
  claimed: { text: "CLAIMED", cls: "stamp-claimed" },
  done: { text: "FULFILLED", cls: "stamp-done" },
  cancelled: { text: "CANCELLED", cls: "stamp-cancelled" },
};

export default function Ticket({ task, currentUserId, onClaim, onComplete, onCancel, onUpdate, onReoffer, anonymousClaim, onAnonymousClaimChange, claimPending, busy, compact = true, showDetailsLink = true }) {
  const [editing, setEditing] = useState(false);
  const [reoffering, setReoffering] = useState(false);
  const storedSchedule = task.scheduledAt || "";
  const [draft, setDraft] = useState({ category: task.category, title: task.title, scheduledDate: storedSchedule.slice(0, 10), scheduledTime: storedSchedule.includes("T") ? storedSchedule.slice(11, 16) : "", location: task.location || "", notes: task.notes || task.description, price: task.price, images: task.images || [] });
  const meta = taskCatMeta(task.category);
  const Icon = meta.icon;
  const isWorker = task.worker && task.worker.id === currentUserId;
  const isRequester = task.requester.id === currentUserId;
  const claimRequested = task.claimRequested || claimPending;
  const hasConfirmedFulfillment = isWorker ? task.workerCompleted : isRequester ? task.requesterCompleted : false;
  const stamp = STAMP[task.status];
  const minScheduledDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  function startEditing() {
    setDraft({ category: task.category, title: task.title, scheduledDate: storedSchedule.slice(0, 10), scheduledTime: storedSchedule.includes("T") ? storedSchedule.slice(11, 16) : "", location: task.location || "", notes: task.notes || task.description, price: task.price, images: task.images || [] });
    setEditing(true);
  }

  function saveEditing(event) {
    event.preventDefault();
    const save = reoffering ? onReoffer(task.id, draft) : onUpdate(task.id, draft);
    save.then(() => { setEditing(false); setReoffering(false); });
  }

  return (
    <div className={`ticket ${task.images?.length ? "ticket-with-image" : ""}`}>
      <div className="ticket-stub">
        <div className="stub-icon">
          <Icon size={20} strokeWidth={2} />
        </div>
        <div className="stub-price">
          <span className="stub-price-label">PAYS</span>
          <span className="stub-price-value">${task.price}</span>
        </div>
        <div className="stub-id">{task.id.slice(0, 8)}</div>
      </div>

      <div className="perforation">
        <span className="hole hole-top" />
        <span className="hole hole-bottom" />
      </div>

      <div className="ticket-body">
        <div className={`stamp ${claimRequested ? "stamp-claimed" : stamp.cls}`}>{claimRequested ? "CLAIM REQUESTED" : stamp.text}</div>
        {editing ? (
          <form className="inline-edit-form" onSubmit={saveEditing}>
            <label className="required-label">Category</label>
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
              {TASK_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
            <label className="required-label">Title</label>
            <input type="text" maxLength={MAX_TITLE_LENGTH} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
            <label className="required-label">Date</label>
            <input type="date" min={minScheduledDate} value={draft.scheduledDate} onChange={(event) => setDraft({ ...draft, scheduledDate: event.target.value })} required />
            <label>Time (optional)</label>
            <input type="time" value={draft.scheduledTime} onChange={(event) => setDraft({ ...draft, scheduledTime: event.target.value })} />
            <label className="required-label">Location</label>
            <input type="text" value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} required />
            <label className="required-label">Anything they should know</label>
            <textarea maxLength={1000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} required />
            <label>Pictures</label>
            <ImagePicker images={draft.images} onChange={(images) => setDraft({ ...draft, images })} />
            {reoffering && (
              <>
                <label>Pay</label>
                <div className="price-row">
                  <span className="price-prefix">$</span>
                  <input type="number" min="1" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required />
                </div>
              </>
            )}
            <div className="inline-edit-actions">
              <button className="btn btn-complete" type="submit" disabled={busy}><Save size={14} /> {reoffering ? "Re-offer ticket" : "Save changes"}</button>
              <button className="btn btn-cancel" type="button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <ImageGallery images={task.images} preview />
            <div className="ticket-cat">{meta.label}</div>
            <div className="ticket-title">{task.title}</div>
            {(task.scheduledAt || task.location) && (
              <div className="ticket-info">
                {task.scheduledAt && <span>When: {new Date(task.scheduledAt).toLocaleString()}</span>}
                {task.location && <span>Where: {task.location}</span>}
              </div>
            )}
            {task.notes && <div className="ticket-desc">
              {compact && task.notes.length > 20 ? (
                <>{task.notes.slice(0, 20)}<Link className="description-more" to={`/tasks/${task.id}`}>...</Link></>
              ) : task.notes}
            </div>}
          </>
        )}
        <div className="ticket-meta">
          <span>Posted by {task.requester.name}</span>
          {task.worker && <span>Claimed by {task.worker.name}</span>}
        </div>

        {task.status === "done" && (task.workerPayout != null || task.price != null) && (
          <div className="ticket-payout">
            {task.worker?.name} got ${task.price ?? task.workerPayout}
          </div>
        )}

        {onClaim && task.status === "open" && !isRequester && !claimRequested && (
          <>
            <label className="checkbox-label claim-anonymous-label">
              <input
                type="checkbox"
                checked={anonymousClaim}
                onChange={(event) => onAnonymousClaimChange(event.target.checked)}
              />
              Claim anonymously
            </label>
            <button className="btn btn-claim" disabled={busy} onClick={() => onClaim(task.id)}>
              Request to claim <ArrowRight size={15} />
            </button>
          </>
        )}
        {onClaim && task.status === "open" && !isRequester && claimRequested && (
          <div className="taken-note"><Clock3 size={14} /> Request sent to poster</div>
        )}
        {onComplete && task.status === "claimed" && (isWorker || isRequester) && (
          <button className="btn btn-complete" disabled={busy || hasConfirmedFulfillment} onClick={() => onComplete(task.id)}>
            <CheckCircle2 size={14} /> {isWorker && task.workerCompleted ? "You confirmed" : isRequester && task.requesterCompleted ? "You confirmed" : "Mark fulfilled"}
          </button>
        )}
        {task.status === "claimed" && !compact && (
          <div className="fulfillment-status">
            <span>Poster: {task.requesterCompleted ? "confirmed" : "waiting"}</span>
            <span>Contractor: {task.workerCompleted ? "confirmed" : "waiting"}</span>
          </div>
        )}
        {task.status === "claimed" && !isWorker && !isRequester && (
          <div className="taken-note">
            <Clock3 size={14} /> Already claimed
          </div>
        )}
        <div className="ticket-actions">
          {onCancel && isRequester && task.status === "open" && (
            <button className="btn btn-cancel" disabled={busy} onClick={() => onCancel(task.id)}>
              <XCircle size={14} /> Cancel
            </button>
          )}
          {onUpdate && isRequester && task.status === "open" && !editing && (
            <button className="btn btn-secondary" disabled={busy} onClick={startEditing}>
              <Pencil size={14} /> Edit ticket
            </button>
          )}
          {onReoffer && isRequester && ["done", "cancelled"].includes(task.status) && !editing && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => { setDraft({ category: task.category, title: task.title, scheduledDate: storedSchedule.slice(0, 10), scheduledTime: storedSchedule.includes("T") ? storedSchedule.slice(11, 16) : "", location: task.location || "", notes: task.notes || task.description, price: task.price, images: task.images || [] }); setReoffering(true); setEditing(true); }}>
              <Pencil size={14} /> Re-offer ticket
            </button>
          )}
        </div>
        {showDetailsLink && (
          <div className="details-row">
            <Link className="details-link" to={`/tasks/${task.id}`}>See more <ArrowRight size={13} /></Link>
          </div>
        )}
      </div>
    </div>
  );
}
