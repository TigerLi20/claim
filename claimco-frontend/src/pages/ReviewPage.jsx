import { useEffect, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

export default function ReviewPage() {
    const { kind, id } = useParams();
    const navigate = useNavigate();
    const [target, setTarget] = useState(null);
    const [rating, setRating] = useState(5);
    const [body, setBody] = useState("");
    const [anonymous, setAnonymous] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.getReviewTarget(kind, id).then((data) => {
            setTarget(data);
            if (data.review) {
                setRating(data.review.rating);
                setBody(data.review.body);
                setAnonymous(data.review.anonymous);
            }
        }).catch((err) => setError(err.message));
    }, [kind, id]);

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            await api.submitReview(kind, id, { rating, body, anonymous });
            navigate(`/users/${target.reviewee.id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="content detail-page">
            <Link className="back-link" to="/mine"><ArrowLeft size={14} /> Back to my tickets</Link>
            {error && <div className="banner banner-error">{error}</div>}
            {!target && !error && <div className="loading-note">Loading review…</div>}
            {target && (
                <div className="form-card review-form-card">
                    <div className="section-label">{target.review ? "YOUR REVIEW" : "WRITE A REVIEW"}</div>
                    <h1>Review {target.reviewee.name}</h1>
                    <p className="page-intro">For: {target.title}</p>
                    {target.review ? (
                        <div className="review-submitted">
                            <div className="review-stars">{"★".repeat(target.review.rating)}{"☆".repeat(5 - target.review.rating)}</div>
                            <p>{target.review.body || "No written note."}</p>
                            <Link className="btn btn-secondary" to={`/users/${target.reviewee.id}`}>View profile</Link>
                        </div>
                    ) : (
                        <form onSubmit={submit}>
                            <label htmlFor="review-rating">Rating</label>
                            <div className="review-rating" id="review-rating">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button key={value} type="button" className={value <= rating ? "active" : ""} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setRating(value)}>
                                        <Star size={22} fill="currentColor" />
                                    </button>
                                ))}
                            </div>
                            <label htmlFor="review-body">A few words</label>
                            <textarea id="review-body" value={body} maxLength={1000} placeholder="What was it like working together?" onChange={(event) => setBody(event.target.value)} />
                            <label className="checkbox-label">
                                <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
                                Submit this review anonymously
                            </label>
                            <div className="submit-row">
                                <button className="btn btn-complete" type="submit" disabled={busy}><Star size={15} /> {busy ? "Submitting…" : "Submit review"}</button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
