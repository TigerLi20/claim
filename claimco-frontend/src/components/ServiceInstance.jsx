import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProfileAvatar from "./ProfileAvatar";

export default function ServiceInstance({ instance, currentUserId, onComplete, busy, compact = true }) {
    const isProvider = instance.providerId === currentUserId;
    const isBuyer = instance.buyer.id === currentUserId;
    const fulfilled = instance.status === "fulfilled";

    return (
        <article className="service-instance-card">
            <div className="service-card-top">
                <div className="service-category">TUTORING INSTANCE</div>
                <div className={`stamp ${fulfilled ? "stamp-done" : "stamp-claimed"} service-history-stamp`}>
                    {fulfilled ? "FULFILLED" : "CLAIMED"}
                </div>
            </div>
            <h2 className="service-title">{instance.title}</h2>
            <div className="purchased-service-provider">
                <ProfileAvatar user={instance.buyer} size="small" />
                <span>Claimed by <Link to={`/users/${instance.buyer.id}`}>{instance.buyer.name}</Link></span>
            </div>
            <div className="service-meta">
                <span>${instance.price} {instance.priceUnit}</span>
                {!compact && <span>
                    Tutor: {instance.providerCompleted ? "confirmed" : "waiting"}
                </span>}
                {!compact && <span>
                    Student: {instance.buyerCompleted ? "confirmed" : "waiting"}
                </span>}
            </div>
            {!fulfilled && (isProvider || isBuyer) && (
                <button className="btn btn-complete fulfillment-action" disabled={busy || (isProvider ? instance.providerCompleted : instance.buyerCompleted)} onClick={() => onComplete(instance.id)}>
                    <CheckCircle2 size={14} /> {(isProvider ? instance.providerCompleted : instance.buyerCompleted) ? "You confirmed" : busy ? "Saving…" : "Mark fulfilled"}
                </button>
            )}
            <div className="details-row">
                <Link className="details-link" to={`/service-instances/${instance.id}`}>See more <ArrowRight size={13} /></Link>
            </div>
        </article>
    );
}