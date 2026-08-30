import { Star } from "lucide-react";
import { Link } from "react-router-dom";

export default function ReviewPrompt({ kind, id }) {
    return (
        <div className="review-prompt">
            <div>
                <div className="review-prompt-title">Completed successfully?</div>
                <div className="review-prompt-copy">Share a quick review of this experience.</div>
            </div>
            <Link className="btn btn-secondary" to={`/reviews/${kind}/${id}`}>
                <Star size={14} /> Write a review
            </Link>
        </div>
    );
}
