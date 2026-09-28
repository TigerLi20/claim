import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { authPath } from "../authNavigation";
import { useAuth } from "../context/AuthContext";

export default function SafetyActions({ userId, targetType = "user", targetId, onBlocked, showBlock = true }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (user?.id === userId) return null;
  function requireLogin() { if (!user) { navigate(authPath(window.location.pathname)); return false; } return true; }
  async function sendReport(event) {
    event.preventDefault();
    if (!requireLogin()) return;
    setBusy(true);
    try { await api.report({ targetType, targetId, reason, details }); setReporting(false); setMessage("Report sent. Thank you."); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function block() {
    if (!requireLogin()) return;
    if (!window.confirm("Block this person? You will no longer be able to message each other.")) return;
    setBusy(true);
    try { await api.blockUser(userId); setMessage("Person blocked."); onBlocked?.(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <div className="safety-actions">
    <div className="safety-buttons"><button type="button" onClick={() => { if (requireLogin()) setReporting(!reporting); }}>Report {targetType === "item" ? "listing" : targetType === "message" ? "message" : "person"}</button>{showBlock && userId && <button type="button" disabled={busy} onClick={block}>Block person</button>}</div>
    {message && <p role="status">{message}</p>}
    {reporting && <form className="safety-report-form" onSubmit={sendReport}><label>Reason<select value={reason} onChange={event => setReason(event.target.value)}><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="scam">Scam</option><option value="prohibited-item">Prohibited item</option><option value="other">Other</option></select></label><label>Details (optional)<textarea maxLength={2000} value={details} onChange={event => setDetails(event.target.value)} /></label><button className="btn btn-secondary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send report"}</button></form>}
  </div>;
}
