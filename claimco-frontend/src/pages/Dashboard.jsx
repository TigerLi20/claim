import { useEffect, useState } from "react";
import { Tag, CheckCircle2, Wallet } from "lucide-react";
import { api } from "../api/client";

export default function Dashboard() {
  const [communityStats, setCommunityStats] = useState({ openCount: 0, claimedCount: 0, fulfilledCount: 0 });
  const [userStats, setUserStats] = useState({
    postedCount: 0,
    doneCount: 0,
    earned: 0,
    tutoringOfferedCount: 0,
    tutoringFulfilledCount: 0,
    tutoringEarned: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.taskStats(), api.dashboardStats()])
      .then(([community, user]) => {
        setCommunityStats(community);
        setUserStats(user);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="content"><div className="banner banner-error">{error}</div></div>;
  if (!communityStats || !userStats) return <div className="content"><div className="loading-note">Loading…</div></div>;

  return (
    <div className="content">
      <div className="section-label">COMMUNITY STATS</div>
      <div className="board-summary-group" style={{ marginBottom: "2rem" }}>
        <div className="board-summary" aria-label="Community ticket status summary">
          <span className="summary-item summary-open"><strong>{communityStats.openCount}</strong> OPEN</span>
          <span className="summary-item summary-claimed"><strong>{communityStats.claimedCount}</strong> CLAIMED</span>
          <span className="summary-item summary-fulfilled"><strong>{communityStats.fulfilledCount}</strong> FULFILLED</span>
        </div>
      </div>

      <div className="section-label">MY TASKS SNAPSHOT</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label"><Tag size={12} /> TASKS POSTED</div>
          <div className="stat-value">{userStats.postedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><CheckCircle2 size={12} /> TASKS FULFILLED</div>
          <div className="stat-value">{userStats.doneCount} tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Wallet size={12} /> TASK MONEY EARNED</div>
          <div className="stat-value earned">${userStats.earned}</div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: "2rem" }}>MY TUTORING SNAPSHOT</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label"><Tag size={12} /> TUTORING SERVICES OFFERED</div>
          <div className="stat-value">{userStats.tutoringOfferedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><CheckCircle2 size={12} /> TUTORING SESSIONS FULFILLED</div>
          <div className="stat-value">{userStats.tutoringFulfilledCount} sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Wallet size={12} /> TUTORING MONEY EARNED</div>
          <div className="stat-value earned">${userStats.tutoringEarned}</div>
        </div>
      </div>
    </div>
  );
}
