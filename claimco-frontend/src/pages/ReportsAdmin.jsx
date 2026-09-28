import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function ReportsAdmin() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { api.reports().then(setReports).catch(err => setError(err.message)); }, []);
  async function update(id, status) {
    try { await api.updateReport(id, status); setReports(current => current.map(report => report.id === id ? { ...report, status } : report)); }
    catch (err) { setError(err.message); }
  }
  return <main className="content legal-page"><h1>Reports</h1><p>Review new reports daily. Record any action taken before closing a report.</p>{error && <div className="banner banner-error">{error}</div>}{reports.map(report => <article className="faq-item" key={report.id}><strong>{report.status.toUpperCase()} · {report.reason}</strong><p>{report.target_type} · {report.target_id} · {report.created_at}</p><p>{report.details || "No additional details"}</p><button className="btn btn-secondary" onClick={() => update(report.id, "reviewed")}>Mark reviewed</button> <button className="btn btn-secondary" onClick={() => update(report.id, "closed")}>Close</button></article>)}</main>;
}
