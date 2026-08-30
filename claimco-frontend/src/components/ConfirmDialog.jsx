import { useState } from "react";

export default function ConfirmDialog({ message, onConfirm, onCancel, allowNote = false, confirmLabel = "Confirm" }) {
    const [note, setNote] = useState("");

    return (
        <div className="confirm-backdrop" role="presentation">
            <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
                <div className="confirm-dialog-header">
                    <h2 id="confirm-dialog-title">PLEASE CONFIRM</h2>
                </div>
                <p className="confirm-dialog-message"><span className="confirm-dialog-message-text">{message}</span></p>
                {allowNote && (
                    <>
                        <label className="confirm-dialog-note-label" htmlFor="confirm-dialog-note">Short note (optional)</label>
                        <textarea
                            id="confirm-dialog-note"
                            className="confirm-dialog-note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            maxLength={50}
                            rows={3}
                            placeholder="Add a note for them"
                        />
                        <div className="confirm-dialog-note-count">{note.length}/50</div>
                    </>
                )}
                <div className="confirm-dialog-actions">
                    <button className="btn btn-cancel" type="button" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-claim" type="button" onClick={() => onConfirm(allowNote ? note.trim() : undefined)}>{confirmLabel}</button>
                </div>
            </section>
        </div>
    );
}
