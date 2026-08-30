import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import ProfileSnippet from "../components/ProfileSnippet";
import Ticket from "../components/Ticket";
import ImageGallery from "../components/ImageGallery";
import ReviewPrompt from "../components/ReviewPrompt";
import { useAuth } from "../context/AuthContext";

export default function TaskDetail() {
    const { id } = useParams();
    const [task, setTask] = useState(null);
    const [error, setError] = useState("");
    const { user } = useAuth();
    const isClaimed = task?.status === "claimed" || task?.status === "done";

    useEffect(() => {
        api.getTask(id).then(setTask).catch((err) => setError(err.message));
    }, [id]);

    return (
        <div className="content detail-page">
            <Link className="back-link" to={isClaimed ? "/mine" : "/board"}><ArrowLeft size={14} /> {isClaimed ? "Back to my tickets" : "Back to tickets"}</Link>
            {error && <div className="banner banner-error">{error}</div>}
            {!task && !error && <div className="loading-note">Loading ticket…</div>}
            {task && (
                <>
                    <div className="detail-heading"><div className="section-label">TASK DETAILS</div><h1>{task.title}</h1></div>
                    <div className="detail-card"><Ticket task={task} currentUserId={user?.id ?? ""} compact={false} showDetailsLink={false} /></div>
                    <ImageGallery images={task.images} />
                    <h2 className="detail-section-title">Posted by</h2>
                    <ProfileSnippet profile={task.requester} />
                    {task.worker && (
                        <>
                            <h2 className="detail-section-title">Claimed by</h2>
                            <ProfileSnippet profile={task.worker} anonymous={task.worker.isAnonymous} />
                        </>
                    )}
                    {task.status === "done" && user && [task.requester.id, task.worker?.id].includes(user.id) && <ReviewPrompt kind="task" id={task.id} />}
                </>
            )}
        </div>
    );
}