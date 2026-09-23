import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import ProfileAvatar from "../components/ProfileAvatar";
export default function PublicProfile() { const { id } = useParams(), [profile, setProfile] = useState(null), [error, setError] = useState(""); useEffect(() => { api.getUserProfile(id).then(setProfile).catch(err => setError(err.message)); }, [id]); return <main className="content detail-page"><Link className="back-link" to="/board">← Back to items</Link>{error && <div className="banner banner-error">{error}</div>}{profile && <div className="public-profile-card"><ProfileAvatar user={profile} /><div className="section-label">SELLER PROFILE</div><h1>{profile.name}</h1><p>{[profile.year, profile.concentration].filter(Boolean).join(" · ")}</p>{profile.aboutMe && <p>{profile.aboutMe}</p>}</div>}</main>; }
