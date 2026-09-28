import { useEffect, useState } from "react";
import { api } from "../api/client";

const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function Insights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.analyticsSummary().then(result => { if (active) setData(result); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  if (error) return <main className="content"><h1 className="page-title">Marketplace insights</h1><div className="banner banner-error">{error}</div></main>;
  if (!data) return <main className="content"><h1 className="page-title">Marketplace insights</h1><p className="loading-note">Loading insights…</p></main>;

  const month = new Date(`${data.period.month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const cards = [
    { label: "Active accounts", value: data.accounts.toLocaleString(), detail: "Accounts currently marked active" },
    { label: "Listings", value: data.listings.total.toLocaleString(), detail: `${data.listings.available} available · ${data.listings.pending} pending · ${data.listings.sold} sold` },
    { label: "Listings sold", value: `${data.listings.soldPercent}%`, detail: "Sold listings ÷ all listings still in the database" },
    { label: "Estimated monthly GMV", value: money(data.estimatedGmvCents), detail: "Asking prices of listings marked sold this month" },
    { label: "Search exit rate", value: data.search.sessions ? `${data.search.exitRate}%` : "—", detail: `${data.search.exits} of ${data.search.sessions} finished text searches opened no listing` },
    { label: "Inquiry rate", value: data.inquiries.itemViews ? `${data.inquiries.rate}%` : "—", detail: `${data.inquiries.newConversations} new item conversations ÷ ${data.inquiries.itemViews} eligible item views` },
    { label: "Average inquiry length", value: data.inquiries.newConversations ? `${data.inquiries.averageMessages} messages` : "—", detail: "Messages per new conversation, including empty chats" },
  ];

  return <main className="content insights-page">
    <div className="section-label">PRIVATE DASHBOARD</div>
    <h1 className="page-title">Marketplace insights</h1>
    <p className="insights-period">{month} · UTC month</p>
    <div className="insights-grid">{cards.map(card => <section className="insight-card" key={card.label}><span>{card.label}</span><strong>{card.value}</strong><p>{card.detail}</p></section>)}</div>
    <p className="insights-note">A search counts as finished when it opens a listing or goes 30 minutes without a listing click. Search and item-view tracking started {new Date(data.period.trackingStartedAt.replace(" ", "T") + "Z").toLocaleDateString("en-US", { timeZone: "UTC" })}; earlier activity cannot be reconstructed. Monthly GMV is an estimate from listing prices because buyers and sellers pay each other directly; listings sold before tracking started have no sold date and are excluded.</p>
  </main>;
}
