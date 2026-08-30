export default function ProfileAvatar({ user, size = "large" }) {
    return user.profileImage ? (
        <img className={`profile-avatar profile-avatar-${size}`} src={user.profileImage} alt={`${user.name}'s profile`} />
    ) : (
        <div className={`profile-avatar profile-avatar-${size} brown-mark`} aria-label="Default profile image">
            <span>BR</span>
        </div>
    );
}