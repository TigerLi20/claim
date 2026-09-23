import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { api } from "../api/client";
import { formatPrice } from "../itemCategories";
import { useAuth } from "../context/AuthContext";
import { authPath } from "../authNavigation";
import ImageGallery from "../components/ImageGallery";
import ItemForm from "../components/ItemForm";
import ProfileSnippet from "../components/ProfileSnippet";

export default function ItemDetail() {
  const { id } = useParams(), navigate = useNavigate(), { user } = useAuth();
  const [item, setItem] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [editing, setEditing] = useState(false);
  useEffect(() => { api.getItem(id).then(setItem).catch(err => setError(err.message)); }, [id]);
  async function message() { if (!user) { navigate(authPath(`/items/${id}`)); return; } setBusy(true); setError(""); try { const data = await api.interest(id); navigate(`/chat/${data.conversationId}`); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function status(value) { setBusy(true); setError(""); try { setItem(await api.setItemStatus(id, value)); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function remove() { if (!window.confirm("Remove this listing and its chats?")) return; setBusy(true); try { await api.deleteItem(id); navigate("/mine"); } catch (err) { setError(err.message); setBusy(false); } }
  return <main className="content detail-page"><Link className="back-link" to="/board"><ArrowLeft size={17} /> Back to items</Link>{error && <div className="banner banner-error">{error}</div>}{!item && !error && <div className="loading-note">Loading item…</div>}{item && <>
    <div className="detail-layout"><div className="detail-visual">{item.images?.length ? <ImageGallery images={item.images} /> : <div className="detail-image-placeholder">No photo yet</div>}</div>
      <div className="detail-info"><div className="detail-meta"><span>{item.category}</span><span>{item.status}</span></div><h1 className="page-title">{item.title}</h1><div className="detail-price">{formatPrice(item.price)}</div><div className="detail-condition">Condition <strong>{item.condition.replace("-", " ")}</strong></div><div className="detail-description"><h2>About this item</h2><p>{item.description}</p></div><div className="detail-seller"><h2>Meet the seller</h2><ProfileSnippet profile={item.seller} /></div>
        {user?.id !== item.sellerId ? <><button className="btn btn-complete detail-message" onClick={message} disabled={busy || item.status === "sold"}><MessageCircle size={18} /> {item.status === "sold" ? "Sold" : busy ? "Opening chat…" : "Message seller"}</button><p className="detail-payment-note">{user ? "Arrange handoff and payment directly with the seller." : "Sign in or create an account to message the seller."}</p></> : <div className="item-seller-actions"><label htmlFor="item-status">Listing status</label><select id="item-status" value={item.status} disabled={busy} onChange={event => status(event.target.value)}><option value="available">Available</option><option value="pending">Pending</option><option value="sold">Sold</option></select><button className="btn btn-secondary" onClick={() => setEditing(!editing)}>{editing ? "Cancel editing" : "Edit listing"}</button><button className="btn btn-cancel" disabled={busy} onClick={remove}>Remove listing</button></div>}
      </div></div>
    {editing && <div className="detail-edit"><h2>Edit your listing</h2><ItemForm initial={item} buttonText="Save listing" onSave={async payload => { setItem(await api.updateItem(id, payload)); setEditing(false); }} /></div>}
  </>}</main>;
}
