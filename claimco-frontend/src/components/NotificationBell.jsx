import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import ConfirmDialog from "./ConfirmDialog";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [applications, setApplications] = useState({});
    const [confirmation, setConfirmation] = useState(null);
    const [menuAlignment, setMenuAlignment] = useState("center");
    const [welcomeGuideAvailable, setWelcomeGuideAvailable] = useState(() => sessionStorage.getItem("claimco_show_welcome") === "1");
    const menuRef = useRef(null);
    const buttonRef = useRef(null);
    const navigate = useNavigate();

    async function load() {
        try {
            setNotifications(await api.notifications());
        } catch (err) {
            setNotifications([]);
        }
    }

    async function openNotifications() {
        setOpen((previous) => {
            if (previous) return false;
            return true;
        });
        const unread = notifications.filter((notification) => !notification.read && notification.type !== "review_request");
        if (unread.length) {
            await Promise.all(unread.map((notification) => api.markNotificationRead(notification.id)));
            await load();
        }
    }

    useEffect(() => {
        if (!open) return;

        function handlePointerDown(event) {
            const clickedBell = buttonRef.current && buttonRef.current.contains(event.target);
            const clickedMenu = menuRef.current && menuRef.current.contains(event.target);

            if (!clickedBell && !clickedMenu) {
                setOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    useEffect(() => {
        load();
        const syncWelcomeGuide = () => setWelcomeGuideAvailable(sessionStorage.getItem("claimco_show_welcome") === "1");
        window.addEventListener("notifications-updated", load);
        window.addEventListener("welcome-guide-available", syncWelcomeGuide);
        return () => {
            window.removeEventListener("notifications-updated", load);
            window.removeEventListener("welcome-guide-available", syncWelcomeGuide);
        };
    }, []);

    useEffect(() => {
        const taskIds = [...new Set(notifications.filter((notification) => notification.type === "task_application" && notification.taskId).map((notification) => notification.taskId))];
        Promise.all(taskIds.map(async (taskId) => [taskId, await api.taskApplications(taskId)]))
            .then((results) => setApplications(Object.fromEntries(results)))
            .catch(() => { });
    }, [notifications]);

    useLayoutEffect(() => {
        if (!open || !menuRef.current || window.innerWidth > 580) return;
        const menu = menuRef.current;
        const bounds = menu.getBoundingClientRect();
        if (bounds.left < 0) {
            setMenuAlignment("left");
        } else if (bounds.right > window.innerWidth) {
            setMenuAlignment("right");
        } else {
            setMenuAlignment("center");
        }
    }, [open, notifications, applications]);

    async function act(notification, action) {
        setBusyId(notification.id);
        try {
            if (notification.type === "task_application") {
                await action(notification.taskId, notification.applicationId);
            } else {
                await action(notification.serviceId, notification.purchaseId);
            }
            await load();
        } finally {
            setBusyId(null);
        }
    }

    function confirmWorker(taskId, applicationId, workerName) {
        setOpen(false);
        setConfirmation({
            message: `Confirm ${workerName} for this ticket? Everyone else who requested it will be declined.`,
            onConfirm: () => act({ id: `${taskId}-${applicationId}`, type: "task_application", taskId, applicationId }, api.confirmTaskApplication),
        });
    }

    function declineWorker(taskId, applicationId, workerName) {
        setOpen(false);
        setConfirmation({
            message: `Decline ${workerName}'s request to claim this ticket?`,
            onConfirm: () => act({ id: `${taskId}-${applicationId}`, type: "task_application", taskId, applicationId }, api.declineTaskApplication),
        });
    }

    function confirmCustomer(notification) {
        const customerName = notification.actorName || "this person";
        setOpen(false);
        setConfirmation({
            message: `Accept ${customerName} to tutor them?`,
            onConfirm: () => act(notification, api.confirmServiceCustomer),
        });
    }

    function declineCustomer(notification) {
        const customerName = notification.actorName || "this person";
        setOpen(false);
        setConfirmation({
            message: `Decline ${customerName}'s request to claim this tutoring offer?`,
            onConfirm: () => act(notification, api.declineServiceCustomer),
        });
    }

    const unreadCount = notifications.filter((notification) => !notification.read).length + (welcomeGuideAvailable ? 1 : 0);
    const taskNotificationIds = new Set();
    const welcomeNotification = welcomeGuideAvailable ? {
        id: "welcome-guide",
        type: "welcome_guide",
        read: false,
        message: "Welcome to Claim — here's a quick overview of how the platform works.",
    } : null;
    const displayNotifications = [welcomeNotification, ...notifications].filter(Boolean).filter((notification) => {
        if (notification.type === "welcome_guide") return true;
        if (notification.type !== "task_application") return true;
        if (applications[notification.taskId] && !applications[notification.taskId].some((application) => application.status === "pending")) return false;
        if (taskNotificationIds.has(notification.taskId)) return false;
        taskNotificationIds.add(notification.taskId);
        return true;
    });

    return (
        <div className="notification-wrap">
            {confirmation && (
                <ConfirmDialog
                    message={confirmation.message}
                    onCancel={() => setConfirmation(null)}
                    onConfirm={() => { setConfirmation(null); confirmation.onConfirm(); }}
                />
            )}
            <button ref={buttonRef} className="icon-button" type="button" aria-label="Notifications" onClick={() => open ? setOpen(false) : openNotifications()}>
                <Bell size={16} />
                {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            </button>
            {open && (
                <div ref={menuRef} className={`notification-menu notification-menu-${menuAlignment}`}>
                    <div className="notification-menu-title">NOTIFICATIONS</div>
                    {displayNotifications.length === 0 ? (
                        <div className="notification-empty">Nothing new.</div>
                    ) : displayNotifications.map((notification) => (
                        <div className={`notification-item ${notification.read ? "read" : ""}`} key={notification.id}>
                            {notification.type === "welcome_guide" ? (
                                <div>
                                    <div>{notification.message}</div>
                                    <div className="notification-actions">
                                        <button
                                            type="button"
                                            className="btn btn-claim"
                                            onClick={() => {
                                                setOpen(false);
                                                setWelcomeGuideAvailable(false);
                                                sessionStorage.removeItem("claimco_show_welcome");
                                                window.dispatchEvent(new CustomEvent("open-welcome-guide"));
                                            }}
                                        >
                                            <Check size={13} /> Open guide
                                        </button>
                                    </div>
                                </div>
                            ) : notification.type === "review_request" ? (
                                <div>
                                    {notification.taskId ? "Your task " : "Your tutoring offer "}
                                    <Link className="notification-title-link" to={notification.taskId ? `/tasks/${notification.taskId}` : (notification.purchaseId ? `/service-instances/${notification.purchaseId}` : `/services/${notification.serviceId}`)}>
                                        {notification.taskTitle || notification.serviceTitle || "completed item"}
                                    </Link>{" "}was fully fulfilled. {" "}
                                    <Link className="notification-title-link" to={notification.taskId ? `/reviews/task/${notification.taskId}` : `/reviews/service/${notification.purchaseId}`}>Write a review</Link>
                                </div>
                            ) : notification.type === "task_application" ? (
                                <>
                                    <div><Link className="notification-title-link" to={`/tasks/${notification.taskId}`}>{notification.taskTitle || "Untitled task"}</Link></div>
                                    <div className="notification-subtitle">People who want to claim this task:</div>
                                    {(applications[notification.taskId] || []).filter((application) => application.status === "pending").map((application) => (
                                        <div className="applicant-row" key={application.id}>
                                            <span>
                                                {application.anonymous ? "Anonymous" : (
                                                    <Link className="notification-actor-link" to={`/users/${application.worker.id}`}>
                                                        {application.worker.name}
                                                    </Link>
                                                )}
                                                {application.requestNote && <span className="applicant-note">{application.requestNote}</span>}
                                            </span>
                                            <span className="notification-actions">
                                                <button type="button" className="btn btn-claim" disabled={busyId === notification.id} onClick={() => confirmWorker(notification.taskId, application.id, application.anonymous ? "this applicant" : application.worker.name)}><Check size={16} /> Confirm</button>
                                                <button type="button" className="btn btn-cancel" disabled={busyId === notification.id} onClick={() => declineWorker(notification.taskId, application.id, application.anonymous ? "this applicant" : application.worker.name)}><X size={16} /> Decline</button>
                                            </span>
                                        </div>
                                    ))}
                                </>
                            ) : notification.type === "task_confirmed" ? (
                                <div>Your request for the task <Link className="notification-title-link" to={`/tasks/${notification.taskId}`}>{notification.taskTitle || "you requested"}</Link> was accepted. <Link className="notification-title-link" to={`/chat/${notification.conversationId}`}>Open chat</Link></div>
                            ) : notification.type === "task_confirmation_sent" ? (
                                <div>You accepted a request to claim your task, <Link className="notification-title-link" to={`/tasks/${notification.taskId}`}>{notification.taskTitle || "this request"}</Link>. <Link className="notification-title-link" to={`/chat/${notification.conversationId}`}>Open chat</Link></div>
                            ) : notification.type === "task_declined" ? (
                                <div>Your task request for <span className="notification-task-name">{notification.taskTitle || "the requested task"}</span> was not selected.</div>
                            ) : notification.type === "service_confirmed" ? (
                                <div>Your tutoring request for <Link className="notification-title-link" to={notification.purchaseId ? `/service-instances/${notification.purchaseId}` : `/services/${notification.serviceId}`}>{notification.serviceTitle || "the requested tutoring offer"}</Link> was accepted. <Link className="notification-title-link" to={`/chat/${notification.conversationId}`}>Open chat</Link></div>
                            ) : notification.type === "service_confirmation_sent" ? (
                                <div>You accepted a request to claim your tutoring offer, <Link className="notification-title-link" to={notification.purchaseId ? `/service-instances/${notification.purchaseId}` : `/services/${notification.serviceId}`}>{notification.serviceTitle || "this request"}</Link>. <Link className="notification-title-link" to={`/chat/${notification.conversationId}`}>Open chat</Link></div>
                            ) : notification.type === "service_declined" ? (
                                <div>Your tutoring request for <span className="notification-task-name">{notification.serviceTitle || "the requested tutoring offer"}</span> was not selected.</div>
                            ) : (
                                <div>
                                    {notification.serviceTitle ? (
                                        <>
                                            <Link className="notification-actor-link" to={`/users/${notification.actorId}`}>
                                                {notification.actorName || "Someone"}
                                            </Link>{" "}wants to claim your tutoring offer,{" "}
                                            <Link className="notification-title-link" to={notification.purchaseId ? `/service-instances/${notification.purchaseId}` : `/services/${notification.serviceId}`}>{notification.serviceTitle}</Link>.
                                            {notification.requestNote && <div className="applicant-note">{notification.requestNote}</div>}
                                        </>
                                    ) : notification.message}
                                </div>
                            )}
                            {notification.type === "service_purchase" && notification.purchaseConfirmationStatus !== "confirmed" && notification.purchaseConfirmationStatus !== "declined" && (
                                <div className="notification-actions">
                                    <button type="button" className="btn btn-claim" disabled={busyId === notification.id} onClick={() => confirmCustomer(notification)}><Check size={13} /> Confirm student</button>
                                    <button type="button" className="btn btn-cancel" disabled={busyId === notification.id} onClick={() => declineCustomer(notification)}><X size={13} /> Decline</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
