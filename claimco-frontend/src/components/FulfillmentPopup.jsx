import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function FulfillmentPopup() {
    const { user } = useAuth();
    const [celebrations, setCelebrations] = useState([]);

    async function load() {
        if (!user) return;
        try {
            const notifications = await api.notifications();
            setCelebrations(notifications.filter((notification) => ["review_request", "task_confirmed", "service_confirmed", "task_confirmation_sent", "service_confirmation_sent"].includes(notification.type) && !notification.read));
        } catch (err) {
            setCelebrations([]);
        }
    }

    useEffect(() => {
        setCelebrations([]);
        if (!user) return undefined;
        load();
        const interval = window.setInterval(load, 3000);
        window.addEventListener("notifications-updated", load);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener("notifications-updated", load);
        };
    }, [user?.id]);

    async function dismiss() {
        const current = celebrations[0];
        if (!current) return;
        setCelebrations((items) => items.slice(1));
        try {
            await api.markNotificationRead(current.id);
            window.dispatchEvent(new Event("notifications-updated"));
        } catch (err) {
            load();
        }
    }

    const current = celebrations[0];
    if (!user || !current) return null;

    const isConfirmation = current.type !== "review_request";
    const confirmedByYou = current.type === "task_confirmation_sent" || current.type === "service_confirmation_sent";
    const isTask = !!current.taskId;
    const itemPath = isTask ? `/tasks/${current.taskId}` : current.purchaseId ? `/service-instances/${current.purchaseId}` : `/services/${current.serviceId}`;
    const reviewPath = isTask ? `/reviews/task/${current.taskId}` : `/reviews/service/${current.purchaseId}`;
    const chatPath = `/chat/${current.conversationId}`;
    const itemName = current.taskTitle || current.serviceTitle || (isTask ? "your ticket" : "your tutoring offer");

    return (
        <div key={current.id} className={`fulfillment-celebration ${isConfirmation ? "confirmation-celebration" : ""}`} role="status" aria-live="polite">
            <button className="fulfillment-close" type="button" aria-label="Dismiss notification" onClick={dismiss}>
                <X size={17} />
            </button>
            <div className="fulfillment-burst" aria-hidden="true">{isConfirmation ? <MessageCircle size={30} /> : <CheckCircle2 size={30} />}</div>
            <div className="fulfillment-kicker">{isConfirmation ? (confirmedByYou ? "REQUEST CONFIRMED!" : "YOU'RE IN!") : (isTask ? "TASK FULFILLED!" : "TUTORING FULFILLED!")}</div>
            <Link className="fulfillment-item-link" to={itemPath}>
                <span className="fulfillment-item-name">{itemName}</span>
            </Link>
            {isConfirmation ? (
                <>
                    <p className="fulfillment-copy">{confirmedByYou ? "You accepted their request. Time to make it happen together." : "Your request was accepted. Time to make it happen together."}</p>
                    <Link className="fulfillment-review-link confirmation-chat-link" to={chatPath}>Open your chat <span aria-hidden="true">-&gt;</span></Link>
                </>
            ) : (
                <>
                    <p className="fulfillment-copy">You and {current.partnerName || (isTask ? "your partner" : "your tutoring partner")} made it happen.</p>
                    <Link className="fulfillment-review-link" to={reviewPath} style={{ textDecoration: 'none' }}>
                        Write a review and celebrate the win <span aria-hidden="true">-&gt;</span>
                    </Link>
                </>
            )}
        </div>
    );
}