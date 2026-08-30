import { Link } from "react-router-dom";
import ProfileAvatar from "./ProfileAvatar";

export default function ProfileSnippet({ profile, anonymous = profile.isAnonymous }) {
    if (anonymous) {
        return <div className="profile-snippet profile-snippet-anonymous">This person posted anonymously.</div>;
    }

    return (
        <div className="profile-snippet">
            <ProfileAvatar user={profile} size="small" />
            <div className="profile-snippet-copy">
                <div className="profile-snippet-name"><Link to={`/users/${profile.id}`}>{profile.name}</Link></div>
                <div className="profile-snippet-meta">
                    {profile.year || "Brown student"}
                    {profile.concentration && <> · {profile.concentration}</>}
                </div>
            </div>
            <Link className="profile-snippet-link" to={`/users/${profile.id}`}>View profile</Link>
        </div>
    );
}