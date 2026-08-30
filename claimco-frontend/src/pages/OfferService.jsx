import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HandHelping } from "lucide-react";
import { api } from "../api/client";
import { TUTORING_CATEGORIES } from "../categories";
import ImagePicker from "../components/ImagePicker";

const MAX_TITLE_LENGTH = 100;

export default function OfferService() {
    const [form, setForm] = useState({ category: "", title: "", description: "", price: "", images: [] });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    async function onSubmit(e) {
        e.preventDefault();
        setError("");
        if (!form.category) {
            setError("Choose a tutoring type before publishing.");
            return;
        }
        setBusy(true);
        try {
            await api.postService({ ...form, price: Number(form.price) });
            navigate("/services");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="content">
            <div className="form-card">
                <div className="section-label">NEW TUTORING OFFER</div>
                {error && <div className="banner banner-error">{error}</div>}
                <div className="cat-picker-label required-label">Tutoring type</div>
                <div className="cat-picker">
                    {TUTORING_CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        return (
                            <div
                                key={category.id}
                                className={`cat-option ${form.category === category.id ? "selected" : ""}`}
                                onClick={() => setForm({ ...form, category: category.id })}
                            >
                                <div className="cat-option-top"><Icon size={16} /> {category.label}</div>
                                <div className="cat-option-blurb">{category.blurb}</div>
                            </div>
                        );
                    })}
                </div>
                <form onSubmit={onSubmit}>
                    <label className="required-label">What can you help with? (be clear and include key words)</label>
                    <input
                        type="text"
                        placeholder="e.g. CSCI0150 tutoring, MCAT verbal prep, resume review"
                        maxLength={MAX_TITLE_LENGTH}
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, MAX_TITLE_LENGTH) })}
                        required
                    />
                    <label>Details for students who may need help</label>
                    <textarea
                        placeholder="Format, availability, topic coverage, and any limits"
                        maxLength={1000}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                    <label className="required-label">Price per booking</label>
                    <div className="price-row">
                        <span className="price-prefix">$</span>
                        <input
                            type="number"
                            min="1"
                            placeholder="25"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                            required
                        />
                    </div>
                    <label>Pictures</label>
                    <ImagePicker images={form.images} onChange={(images, imageError) => { setForm({ ...form, images }); setError(imageError); }} />
                    <div className="submit-row">
                        <button className="btn btn-complete" type="submit" disabled={busy}>
                            <HandHelping size={15} /> {busy ? "Publishing…" : "Publish tutoring"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
