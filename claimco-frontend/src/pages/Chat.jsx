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
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");
    const bottomRef = useRef(null);
    const currentUserId = String(user?.id ?? "");

    useEffect(() => {
        const refreshConversation = () => {
            api.markConversationRead(conversationId).then(() => window.dispatchEvent(new Event("conversation-read"))).catch(() => { });
            api.conversationMessages(conversationId).then((data) => {
                setOtherUser(data.otherUser);
                setMessages(data.messages);
            }).catch((err) => setError(err.message));
        };

        refreshConversation();
        if (socket.connected) socket.disconnect();
        socket.auth = { token: localStorage.getItem("claimco_token") };
        function joinConversation() {
            socket.emit("join_conversation", conversationId);
        }
        if (socket.connected) joinConversation();
        else {
            socket.once("connect", joinConversation);
            socket.connect();
        }
        function onMessage(message) {
            if (String(message.conversationId) === String(conversationId)) setMessages((current) => [...current, message]);
        }
        socket.on("new_message", onMessage);
        const heartbeat = setInterval(() => {
            if (socket.connected) socket.emit("presence_heartbeat");
        }, 30 * 1000);
        window.addEventListener("conversation-status-updated", refreshConversation);
        return () => {
            socket.off("new_message", onMessage);
            socket.off("connect", joinConversation);
            window.removeEventListener("conversation-status-updated", refreshConversation);
            clearInterval(heartbeat);
            socket.disconnect();
        };
    }, [conversationId, user?.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
            if (response?.message) setMessages((current) => [...current, response.message]);
            setDraft("");
        });
    }

    return (
        <div className="content chat-page">
            <Link className="back-link" to="/messages"><ArrowLeft size={14} /> Back to chats</Link>
            {error && <div className="banner banner-error">{error}</div>}
            {otherUser && <h1 className="chat-heading">Conversation with {otherUser.name}</h1>}
            <div className="chat-room">
                <div className="chat-messages">
                    {messages.map((message) => {
                        const isMine = String(message.senderId) === currentUserId;
                        return <div key={message.id} className={`chat-message ${isMine ? "chat-message-mine" : "chat-message-other"}`}>{message.body}</div>;
                    })}
                    <div ref={bottomRef} />
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
