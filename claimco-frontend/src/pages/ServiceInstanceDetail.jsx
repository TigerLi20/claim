import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import ImageGallery from "../components/ImageGallery";
import ProfileSnippet from "../components/ProfileSnippet";
import ReviewPrompt from "../components/ReviewPrompt";

export default function ServiceInstanceDetail() {
    const { id } = useParams();
    const [instance, setInstance] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.getServiceInstance(id).then(setInstance).catch((err) => setError(err.message));
    }, [id]);

    return (
        <div className="content detail-page">
            <Link className="back-link" to="/mine"><ArrowLeft size={14} /> Back to my tickets</Link>
            {error && <div className="banner banner-error">{error}</div>}
            {!instance && !error && <div className="loading-note">Loading tutoring claim...</div>}
            {instance && (
                <>
                    <div className="detail-heading"><div className="section-label">TUTORING CLAIM DETAILS</div><h1>{instance.title}</h1></div>
                    <div className="service-detail-card">
                        <div className={`stamp ${instance.fulfilled ? "stamp-done" : "stamp-claimed"} service-detail-stamp`}>
                            {instance.fulfilled ? "FULFILLED" : "CLAIMED"}
                        </div>
                        <div className="service-detail-price">${instance.price} <span>{instance.priceUnit}</span></div>
                        <p>{instance.description || "No additional details provided."}</p>
                        <div className="fulfillment-status">
                            <span>Tutor: {instance.providerCompleted ? "confirmed" : "waiting"}</span>
                            <span>Student: {instance.buyerCompleted ? "confirmed" : "waiting"}</span>
                        </div>
                    </div>
                    <ImageGallery images={instance.images} />
                    <h2 className="detail-section-title">Tutor</h2>
                    <ProfileSnippet profile={instance.provider} />
                    <h2 className="detail-section-title">Student</h2>
                    <ProfileSnippet profile={instance.buyer} />
                    {instance.fulfilled && <ReviewPrompt kind="service" id={instance.id} />}
                </>
            )}
        </div>
    );
}
