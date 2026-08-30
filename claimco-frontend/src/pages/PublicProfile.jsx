import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import ProfileAvatar from "../components/ProfileAvatar";
import { BRAND } from "../brand";

export default function PublicProfile() {
    const { id } = useParams();
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.getUserProfile(id).then(setProfile).catch((err) => setError(err.message));
    }, [id]);

    return (
        <div className="content detail-page">
            <Link className="back-link" to="/board"><ArrowLeft size={14} /> Back to tickets</Link>
            {error && <div className="banner banner-error">{error}</div>}
            {!profile && !error && <div className="loading-note">Loading profile…</div>}
            {profile && (
                <div className="public-profile-card">
                    <ProfileAvatar user={profile} />
                    <div className="section-label">{`${BRAND.platform.toUpperCase()} PROFILE`}</div>
                    <h1>{profile.name}</h1>
                    <div className="public-profile-meta">
                        {profile.year || "Brown student"}
                        {profile.concentration && <> · {profile.concentration}</>}
                    </div>
                    <div className="profile-stats">
                        <div><strong>{profile.tasksPosted}</strong><span>Tasks posted</span></div>
                        <div><strong>{profile.tasksCompleted}</strong><span>Tasks completed</span></div>
                        <div><strong>{profile.servicesOffered}</strong><span>Tutoring offers</span></div>
                    </div>
                    <div className="profile-reviews">
                        <h2>Reviews {profile.reviewCount > 0 && <span>({profile.reviewCount})</span>}</h2>
                        {profile.averageRating != null && <div className="profile-rating"><span className="review-stars">{"★".repeat(Math.round(profile.averageRating))}{"☆".repeat(5 - Math.round(profile.averageRating))}</span> {profile.averageRating.toFixed(1)} average</div>}
                        {profile.reviewCount === 0 ? <p>No reviews yet.</p> : (
                            profile.reviews.map((review) => (
                                <div className="profile-review" key={review.id}>
                                    <div className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
                                    {review.body && <p>{review.body}</p>}
                                    <span>From {review.reviewer.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                    {profile.aboutMe && <p>{profile.aboutMe}</p>}
                </div>
            )}
        </div>
    );
}