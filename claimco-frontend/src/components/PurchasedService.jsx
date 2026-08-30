import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProfileAvatar from "./ProfileAvatar";

export default function PurchasedService({ purchase, currentUserId, onComplete, busy, compact = true }) {
    const isFulfilled = purchase.providerCompleted && purchase.buyerCompleted;
    const isBuyer = purchase.buyer?.id === currentUserId;
    return (
        <article className="purchased-service-card">
            <div className="service-card-top">
                <div className="service-category">TUTORING CLAIM</div>
                <div className={`stamp ${isFulfilled ? "stamp-done" : "stamp-claimed"} service-history-stamp`}>
                    {isFulfilled ? "FULFILLED" : purchase.confirmationStatus === "pending" ? "CLAIM REQUESTED" : "CLAIMED"}
                </div>
            </div>
            <h2 className="service-title">{purchase.title}</h2>
            {purchase.description && <p className="service-desc">
                {compact && purchase.description.length > 20 ? (
                    <>{purchase.description.slice(0, 20)}<Link className="description-more" to={`/service-instances/${purchase.id}`}>...</Link></>
                ) : purchase.description}
            </p>}
            <div className="purchased-service-provider">
                <ProfileAvatar user={purchase.provider} size="small" />
                <span>Provided by <Link to={`/users/${purchase.provider.id}`}>{purchase.provider.name}</Link></span>
            </div>
            <div className="service-meta">
                <span className="service-meta-label">Claimed for</span>
                <span className="service-price">${purchase.price} {purchase.priceUnit}</span>
            </div>
            {purchase.confirmationStatus === "confirmed" && !isFulfilled && !compact && (
                <div className="fulfillment-status">
                    <span>Tutor: {purchase.providerCompleted ? "confirmed" : "waiting"}</span>
                    <span>Student: {purchase.buyerCompleted ? "confirmed" : "waiting"}</span>
                </div>
            )}
            {!isFulfilled && isBuyer && purchase.confirmationStatus === "confirmed" && onComplete && (
                <button className="btn btn-complete fulfillment-action" disabled={busy || purchase.buyerCompleted} onClick={() => onComplete(purchase.id)}>
                    <CheckCircle2 size={14} /> {purchase.buyerCompleted ? "You confirmed" : busy ? "Saving…" : "Mark fulfilled"}
                </button>
            )}
            <div className="details-row">
                <Link className="details-link" to={`/service-instances/${purchase.id}`}>See more <ArrowRight size={13} /></Link>
            </div>
        </article>
    );
}
