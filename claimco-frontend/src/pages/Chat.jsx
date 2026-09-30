import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { socket } from "../chat/socket";
import { useAuth } from "../context/AuthContext";

export default function Chat() {
    const { conversationId } = useParams();
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [otherUser, setOtherUser] = useState(null);
    const [item, setItem] = useState(null);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");
    const messagesRef = useRef(null);
    const currentUserId = String(user?.id ?? "");
    const visibleMessages = messages.filter((message) => String(message.conversationId) === String(conversationId));

    function addMessage(message) {
        setMessages((current) => {
            const byId = new Map([...current, message].map((entry) => [String(entry.id), entry]));
            return [...byId.values()].sort((first, second) => Number(first.id) - Number(second.id));
        });
    }

    useEffect(() => {
        let active = true;
        const refreshConversation = () => {
            api.markConversationRead(conversationId).then(() => window.dispatchEvent(new Event("conversation-read"))).catch(() => { });
            api.conversationMessages(conversationId).then((data) => {
                if (!active) return;
                setOtherUser(data.otherUser);
                setItem(data.item);
                setMessages((current) => {
                    const byId = new Map([...data.messages, ...current.filter((message) => String(message.conversationId) === String(conversationId))].map((message) => [String(message.id), message]));
                    return [...byId.values()].sort((first, second) => Number(first.id) - Number(second.id));
                });
            }).catch((err) => { if (active) setError(err.message); });
        };

        refreshConversation();
        socket.auth = { token: localStorage.getItem("claimco_token") };
        function joinConversation() {
            socket.emit("join_conversation", conversationId);
        }
        socket.on("connect", joinConversation);
        if (socket.connected) joinConversation();
        else socket.connect();
        function onMessage(message) {
            if (String(message.conversationId) === String(conversationId)) addMessage(message);
        }
        socket.on("new_message", onMessage);
        const heartbeat = setInterval(() => {
            if (socket.connected) socket.emit("presence_heartbeat");
        }, 30 * 1000);
        window.addEventListener("conversation-status-updated", refreshConversation);
        return () => {
            active = false;
            socket.off("new_message", onMessage);
            socket.off("connect", joinConversation);
            socket.emit("leave_conversation", conversationId);
            window.removeEventListener("conversation-status-updated", refreshConversation);
            clearInterval(heartbeat);
        };
    }, [conversationId, user?.id]);

    useEffect(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [messages]);

    function sendMessage(event) {
        event.preventDefault();
        if (!draft.trim()) return;
        const body = draft;
        socket.emit("send_message", { conversationId, body }, (response) => {
            if (response?.error) {
                setError(response.error);
                return;
            }
            if (response?.message) addMessage(response.message);
            setDraft("");
        });
    }

    return (
        <div className="content chat-page">
            <Link className="back-link" to="/messages"><ArrowLeft size={14} /> Back to chats</Link>
            {error && <div className="banner banner-error">{error}</div>}
            {otherUser && <h1 className="chat-heading">{item?.title} · {otherUser.name}</h1>}
            {item && <Link to={`/items/${item.id}`}>View item</Link>}
            <div className="chat-room">
                <div className="chat-messages" ref={messagesRef}>
                    {visibleMessages.map((message) => {
                        const isMine = String(message.senderId) === currentUserId;
                        return <div key={message.id} className={`chat-message ${isMine ? "chat-message-mine" : "chat-message-other"}`}>{message.isAutoReply && <small className="chat-auto-reply-label">Automatic reply</small>}{message.body}</div>;
                    })}
                </div>
                <form className="chat-input" onSubmit={sendMessage}>
                    <input
                        maxLength={1000}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Type a message..."
                    />
                    <button className="btn btn-complete" type="submit"><Send size={14} /> Send</button>
                </form>
            </div>
        </div>
    );
}
