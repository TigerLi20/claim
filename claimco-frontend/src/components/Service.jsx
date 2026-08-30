import { PauseCircle, Repeat2, ArrowRight, Pencil, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import ImageGallery from "./ImageGallery";
import ImagePicker from "./ImagePicker";
import { tutoringCatMeta } from "../categories";

const MAX_TITLE_LENGTH = 120;

export default function Service({ service, onDeactivate, onActivate, onUpdate, onReoffer, onPurchase, busy }) {
    const { user } = useAuth();
    const [editing, setEditing] = useState(false);
    const [reoffering, setReoffering] = useState(false);
    const [draft, setDraft] = useState({ title: service.title, description: service.description, price: service.price, images: service.images || [] });
    const isProvider = service.provider.id === user.id;
    const showOpenStamp = !isProvider && service.claimPhase === "open";
    const detailsPath = !isProvider && service.claimStatus === "confirmed" && service.purchaseId ? `/service-instances/${service.purchaseId}` : `/services/${service.id}`;

    return (
        <article className={`service-card ${service.images?.length ? "service-card-with-image" : ""} ${service.status !== "active" ? "service-card-muted" : ""}`}>
            {showOpenStamp && <div className="stamp stamp-open service-stamp">OPEN</div>}
            <div className="service-card-top">
                <div className="service-category">{tutoringCatMeta(service.category).label}</div>
                {!isProvider && service.isPurchased && (
                    <div className="stamp stamp-claimed service-history-stamp">
                        {service.claimStatus === "pending" ? "CLAIM REQUESTED" : "CLAIMED"}
                    </div>
                )}
            </div>
            {editing ? (
                <form className="inline-edit-form" onSubmit={(event) => { event.preventDefault(); const save = reoffering ? onReoffer(service.id, draft) : onUpdate(service.id, { title: draft.title, description: draft.description, images: draft.images }); save.then(() => { setEditing(false); setReoffering(false); }); }}>
                    <label>Title</label>
                    <input type="text" maxLength={MAX_TITLE_LENGTH} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
                    <label>Description</label>
                    <textarea maxLength={1000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
                    <label>Pictures</label>
                    <ImagePicker images={draft.images} onChange={(images) => setDraft({ ...draft, images })} />
                    {reoffering && (
                        <>
                            <label>Price</label>
                            <div className="price-row">
                                <span className="price-prefix">$</span>
                                <input type="number" min="1" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required />
                            </div>
                        </>
                    )}
                    <div className="inline-edit-actions">
                        <button className="btn btn-complete" type="submit" disabled={busy}><Save size={14} /> {reoffering ? "Re-offer service" : "Save changes"}</button>
                        <button className="btn btn-cancel" type="button" onClick={() => { setEditing(false); setReoffering(false); }}>Cancel</button>
                    </div>
                </form>
            ) : (
                <>
                    <ImageGallery images={service.images} preview />
                    <h2 className="service-title">{service.title}</h2>
                    {service.description && <p className="service-desc">
                        {service.description.length > 20 ? (
                            <>{service.description.slice(0, 20)}<Link className="description-more" to={detailsPath}>...</Link></>
                        ) : service.description}
                    </p>}
                </>
            )}
            <div className="service-meta">
                <span className="service-meta-label">Offered by {service.provider.name}</span>
                <span className="service-price">${service.price} {service.priceUnit}</span>
            </div>
            {isProvider && service.status === "active" && onDeactivate && (
                <button className="btn btn-cancel" disabled={busy} onClick={() => onDeactivate(service.id)}>
                    <PauseCircle size={14} /> {busy ? "Pausing…" : "Pause service"}
                </button>
            )}
            {isProvider && service.status === "inactive" && onReoffer && !editing && (
                <button
                    className="btn btn-claim"
                    disabled={busy}
                    onClick={() => { setDraft({ title: service.title, description: service.description, price: service.price, images: service.images || [] }); setReoffering(true); setEditing(true); }}
                >
                    <Repeat2 size={14} /> Re-offer service
                </button>
            )}
            {!isProvider && onPurchase && service.status === "active" && !service.isPurchased && (
                <button className="btn btn-claim" disabled={busy} onClick={() => onPurchase(service.id)}>
                    {busy ? "Requesting…" : "Request to claim"}
                </button>
            )}
            {isProvider && onUpdate && !editing && (
                <button className="btn btn-secondary" disabled={busy} onClick={() => { setDraft({ title: service.title, description: service.description, price: service.price, images: service.images || [] }); setReoffering(false); setEditing(true); }}>
                    <Pencil size={14} /> Edit service
                </button>
            )}
            <div className="details-row">
                <Link className="details-link" to={detailsPath}>See more <ArrowRight size={13} /></Link>
            </div>
        </article>
    );
}

