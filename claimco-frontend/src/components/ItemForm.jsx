import { useState } from "react";
import { ITEM_CATEGORIES } from "../itemCategories";
import ImagePicker from "./ImagePicker";
export default function ItemForm({ initial = {}, onSave, buttonText = "Post item" }) {
  const [form, setForm] = useState({ title: initial.title || "", description: initial.description || "", price: initial.price ?? "", category: initial.category || "", condition: initial.condition || "used", images: initial.images || [] });
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  async function submit(event) { event.preventDefault(); setBusy(true); setError(""); try { await onSave({ ...form, price: Number(form.price) }); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form className="form-card item-form" onSubmit={submit}>
    {error && <div className="banner banner-error">{error}</div>}
    <label htmlFor="item-title">Title</label><input id="item-title" type="text" value={form.title} maxLength={120} onChange={event => update("title", event.target.value)} required />
    <label htmlFor="item-description">Description</label><textarea id="item-description" value={form.description} maxLength={2000} onChange={event => update("description", event.target.value)} required />
    <label htmlFor="item-price">Price ($)</label><input id="item-price" type="number" min="0" max="100000" step="0.01" value={form.price} onChange={event => update("price", event.target.value)} required />
    <label htmlFor="item-category">Category</label><select id="item-category" value={form.category} onChange={event => update("category", event.target.value)} required><option value="">Choose a category</option>{ITEM_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
    <label htmlFor="item-condition">Condition</label><select id="item-condition" value={form.condition} onChange={event => update("condition", event.target.value)}><option value="new">New</option><option value="like-new">Like new</option><option value="used">Used</option></select>
    <label>Photos (up to 3)</label><ImagePicker images={form.images} onChange={(images, message) => { update("images", images); if (message) setError(message); }} />
    <p>Arrange payment and handoff directly with the buyer in chat. Bruno Sells does not process payments.</p>
    <button className="btn btn-complete" disabled={busy}>{busy ? "Saving…" : buttonText}</button>
  </form>;
}
