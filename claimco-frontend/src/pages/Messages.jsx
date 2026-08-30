import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { api } from "../api/client";

export default function Messages() {
    const [conversations, setConversations] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        api.conversations().then(setConversations).catch((err) => setError(err.message));
    }, []);

    return (
        <div className="content">
            <div className="section-label">MESSAGES</div>
            <h1 className="page-title">Chats</h1>
            {error && <div className="banner banner-error">{error}</div>}
            {!error && conversations.length === 0 ? (
                <div className="empty-note"><MessageCircle size={18} /> No chats yet. Request to claim a ticket or tutoring offer to start one.</div>
            ) : (
                <div className="conversation-list">
                    {conversations.map((conversation) => (
                        <Link className="conversation-item" key={conversation.id} to={`/chat/${conversation.id}`}>
                            <div className="conversation-copy">
                                <div className="conversation-person">{conversation.otherUser.name}</div>
                                <div className="conversation-preview">{conversation.lastMessage}</div>
                            </div>
                            {conversation.unreadCount > 0 && <span className="conversation-unread-dot" aria-label="Unread messages" />}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
