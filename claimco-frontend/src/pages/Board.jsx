import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { api } from "../api/client";
import { ITEM_CATEGORIES } from "../itemCategories";
import ItemCard from "../components/ItemCard";
export default function Board() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const category = ITEM_CATEGORIES.some(c => c.id === params.get("category")) ? params.get("category") : "";
  const [items, setItems] = useState([]), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const updateFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setLoading(true);
  };
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => api.listItems({ category, search }).then(data => { if (active) { setItems(data); setError(""); } }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }), 150);
    return () => { active = false; clearTimeout(timer); };
  }, [category, search]);
  return <main className="content browse-page"><h1 className="visually-hidden">Browse items</h1>
    <div className="item-filters"><div className="search-wrap"><Search size={20} /><input className="browser-search" value={search} onChange={event => updateFilter("search", event.target.value)} placeholder="Search for something good..." aria-label="Search item titles" /></div><select value={category} onChange={event => updateFilter("category", event.target.value)} aria-label="Category"><option value="">All categories</option>{ITEM_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><Link className="btn btn-complete" to="/post">List an item <ArrowRight size={17} /></Link></div>
    <div className="category-chips"><button className={!category ? "active" : ""} onClick={() => updateFilter("category", "")}>All items</button>{ITEM_CATEGORIES.map(c => <button key={c.id} className={category === c.id ? "active" : ""} onClick={() => updateFilter("category", c.id)}>{c.label}</button>)}</div>
    <div className="results-heading"><h2>{category ? ITEM_CATEGORIES.find(c => c.id === category)?.label : "Fresh finds"}</h2><span>{!loading && !error ? `${items.length} item${items.length === 1 ? "" : "s"}` : ""}</span></div>
    {error && <div className="banner banner-error">{error}</div>}{loading ? <div className="loading-note">Loading items…</div> : items.length ? <div className="item-grid">{items.map(item => <ItemCard key={item.id} item={item} />)}</div> : <div className="empty-note"><strong>No finds here yet.</strong><span>Try another category or search.</span></div>}
  </main>;
}
