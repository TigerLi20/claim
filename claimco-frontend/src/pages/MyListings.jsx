import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ItemCard from "../components/ItemCard";
export default function MyListings() {
  const [listings, setListings] = useState([]), [inquiries, setInquiries] = useState([]), [tab, setTab] = useState("listings"), [error, setError] = useState("");
  useEffect(() => { Promise.all([api.myListings(), api.myInquiries()]).then(([a, b]) => { setListings(a); setInquiries(b); }).catch(err => setError(err.message)); }, []);
  const items = tab === "listings" ? listings : inquiries;
  return <main className="content"><div className="page-heading"><div className="section-label">MY MARKETPLACE</div><Link className="btn btn-complete" to="/post">Sell an item</Link></div><h1 className="page-title">My items</h1><div className="subtabs"><button className={tab === "listings" ? "active" : ""} onClick={() => setTab("listings")}>My Listings ({listings.length})</button><button className={tab === "inquiries" ? "active" : ""} onClick={() => setTab("inquiries")}>My Inquiries ({inquiries.length})</button></div>{error && <div className="banner banner-error">{error}</div>}{items.length ? <div className="item-grid">{items.map(item => <ItemCard key={item.id} item={item} />)}</div> : <div className="empty-note">{tab === "listings" ? "You have not listed an item yet." : "You have not messaged a seller yet."}</div>}</main>;
}
