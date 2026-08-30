import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import ProfileSnippet from "../components/ProfileSnippet";
import ImageGallery from "../components/ImageGallery";

export default function ServiceDetail() {
    const { id } = useParams();
    const [service, setService] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.getService(id).then(setService).catch((err) => setError(err.message));
    }, [id]);

    return (
        <div className="content detail-page">
            <Link className="back-link" to="/services"><ArrowLeft size={14} /> Back to tutoring</Link>
            {error && <div className="banner banner-error">{error}</div>}
            {!service && !error && <div className="loading-note">Loading tutoring…</div>}
            {service && (
                <>
                    <div className="detail-heading"><div className="section-label">TUTORING DETAILS</div><h1>{service.title}</h1></div>
                    <div className="service-detail-card">
                        <div className="service-detail-price">${service.price} <span>{service.priceUnit}</span></div>
                        <p>{service.description || "No additional details provided."}</p>
                    </div>
                    <ImageGallery images={service.images} />
                    <h2 className="detail-section-title">Offered by</h2>
                    <ProfileSnippet profile={service.provider} />
                </>
            )}
        </div>
    );
}