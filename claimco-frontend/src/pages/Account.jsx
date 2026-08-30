import { useEffect, useRef, useState } from "react";
import { Save, Upload } from "lucide-react";
import ProfileAvatar from "../components/ProfileAvatar";
import { useAuth } from "../context/AuthContext";

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

export default function Account() {
    const { user, updateProfile } = useAuth();
    const [form, setForm] = useState({ name: user.name, year: user.year || "", concentration: user.concentration || "", aboutMe: user.aboutMe || "" });
    const [profileImage, setProfileImage] = useState(user.profileImage || null);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    const fileInput = useRef(null);

    useEffect(() => {
        setForm({ name: user.name, year: user.year || "", concentration: user.concentration || "", aboutMe: user.aboutMe || "" });
        setProfileImage(user.profileImage || null);
    }, [user]);

    function handleImage(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        setSaved(false);
        if (!file.type.startsWith("image/")) {
            setError("Please choose an image file.");
            return;
        }
        if (file.size > MAX_PROFILE_IMAGE_BYTES) {
            event.target.value = "";
            setError("File size is too large. The maximum profile picture size is 2 MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            const image = reader.result;
            setError("");
            setSaved(false);
            setBusy(true);
            try {
                await updateProfile({ ...form, profileImage: image });
                setProfileImage(image);
                setSaved(true);
            } catch (err) {
                setError(err.message);
            } finally {
                setBusy(false);
            }
        };
        reader.readAsDataURL(file);
    }

    async function restoreDefault() {
        setError("");
        setSaved(false);
        setBusy(true);
        try {
            await updateProfile({ ...form, profileImage: null });
            setProfileImage(null);
            setSaved(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function onSubmit(event) {
        event.preventDefault();
        setError("");
        setSaved(false);
        setBusy(true);
        try {
            await updateProfile({ ...form, profileImage });
            setSaved(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="content">
            <div className="account-layout">
                <section className="profile-card">
                    <ProfileAvatar user={{ ...user, profileImage }} />
                    <button className="btn btn-complete" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
                        <Upload size={15} /> {busy ? "Saving picture…" : "Upload picture"}
                    </button>
                    <button className="restore-default" type="button" disabled={busy || !profileImage} onClick={restoreDefault}>
                        Restore to default
                    </button>
                    <input ref={fileInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImage} />
                    <p className="profile-note">Your profile picture will replace the default avatar.</p>
                </section>
                <section className="form-card account-form-card">
                    <div className="section-label">MY ACCOUNT</div>
                    {error && <div className="banner banner-error">{error}</div>}
                    {saved && <div className="banner banner-success">Account updated.</div>}
                    <form onSubmit={onSubmit}>
                        <label>Name</label>
                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        <label>Year</label>
                        <input type="text" placeholder="e.g. Class of 2028" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                        <label>Concentration</label>
                        <input type="text" placeholder="e.g. Applied Mathematics" value={form.concentration} onChange={(e) => setForm({ ...form, concentration: e.target.value })} />
                        <label>About me</label>
                        <textarea
                            placeholder="A short introduction for the Claim community"
                            maxLength={500}
                            value={form.aboutMe}
                            onChange={(e) => setForm({ ...form, aboutMe: e.target.value })}
                        />
                        <div className="submit-row">
                            <button className="btn btn-complete" type="submit" disabled={busy}>
                                <Save size={15} /> {busy ? "Saving…" : "Save profile"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}