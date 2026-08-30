import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../api/client";
import { TASK_CATEGORIES } from "../categories";
import ImagePicker from "../components/ImagePicker";

const MAX_TITLE_LENGTH = 100;

export default function PostTask() {
  const [form, setForm] = useState({ category: "", title: "", scheduledDate: "", scheduledTime: "", location: "", notes: "", price: "", anonymous: false, images: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function updateImages(images, imageError) {
    setForm({ ...form, images });
    setError(imageError);
  }
  const navigate = useNavigate();
  const minScheduledDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.category) {
      setError("Choose a ticket type before posting.");
      return;
    }
    if (!form.scheduledDate) {
      setError("Choose a date before posting.");
      return;
    }
    setBusy(true);
    try {
      await api.postTask({ ...form, price: Number(form.price) });
      navigate("/board");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content">
      <div className="form-card">
        <div className="section-label">NEW TASK</div>
        {error && <div className="banner banner-error">{error}</div>}

        <div className="cat-picker-label required-label">Task type</div>
        <div className="cat-picker">
          {TASK_CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.id}
                className={`cat-option ${form.category === c.id ? "selected" : ""}`}
                onClick={() => setForm({ ...form, category: c.id })}
              >
                <div className="cat-option-top">
                  <Icon size={16} /> {c.label}
                </div>
                <div className="cat-option-blurb">{c.blurb}</div>
              </div>
            );
          })}
        </div>

        <form onSubmit={onSubmit}>
          <label className="required-label">What do you need done</label>
          <input
            type="text"
            placeholder="e.g. Help me move into Hegeman Hall"
            maxLength={MAX_TITLE_LENGTH}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, MAX_TITLE_LENGTH) })}
            required
          />

          <label className="required-label">Date</label>
          <input type="date" min={minScheduledDate} value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} required />

          <label>Time (optional)</label>
          <input type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} />

          <label className="required-label">Location</label>
          <input type="text" placeholder="e.g. 123 Brown Street" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />

          <label className="required-label">Anything they should know</label>
          <textarea maxLength={1000} placeholder="Details for whoever claims it" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} required />

          <label className="required-label">What you're paying</label>
          <div className="price-row">
            <span className="price-prefix">$</span>
            <input
              type="number"
              min="1"
              placeholder="50"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </div>

          <label>Pictures</label>
          <ImagePicker images={form.images} onChange={updateImages} />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.anonymous}
              onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
            />
            Post this ticket anonymously
          </label>

          <div className="submit-row">
            <button className="btn btn-complete" type="submit" disabled={busy}>
              <Plus size={15} /> {busy ? "Posting…" : "Post task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
