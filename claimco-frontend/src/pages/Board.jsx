import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../api/client";
import Ticket from "../components/Ticket";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";

export default function Board() {
  const { user } = useAuth();
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [anonymousClaims, setAnonymousClaims] = useState({});
  const [pendingRequests, setPendingRequests] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ openCount: 0, claimedCount: 0, fulfilledCount: 0 });
  const [onboardingChoice, setOnboardingChoice] = useState("");

  useEffect(() => {
    const syncChoice = () => {
      setOnboardingChoice(sessionStorage.getItem("claimco_onboarding_choice") || "");
    };

    syncChoice();
    window.addEventListener("onboarding-choice-updated", syncChoice);
    return () => window.removeEventListener("onboarding-choice-updated", syncChoice);
  }, [location.pathname]);

  const normalizedSearch = search.trim().toLowerCase();
  const clearOnboardingPrompt = () => {
    if (!sessionStorage.getItem("claimco_onboarding_choice")) return;
    sessionStorage.removeItem("claimco_onboarding_choice");
    setOnboardingChoice("");
  };
  const visibleTasks = normalizedSearch
    ? tasks.filter((task) => String(task.title || "").toLowerCase().includes(normalizedSearch))
    : tasks;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [data, stats] = await Promise.all([api.listTasks(), api.taskStats()]);
      setTasks(data);
      setStats(stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const refreshTimer = window.setInterval(load, 30000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  async function handleClaim(id) {
    setConfirmation({
      message: "Are you sure you want to request to claim this task?",
      onConfirm: (note) => submitClaim(id, note),
    });
  }

  async function submitClaim(id, note) {
    setBusyId(id);
    setError("");
    try {
      await api.claimTask(id, !!anonymousClaims[id], note);
      setPendingRequests((requests) => ({ ...requests, [id]: true }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(id) {
    setBusyId(id);
    setError("");
    try {
      await api.completeTask(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdate(id, payload) {
    setBusyId(id);
    setError("");
    try {
      await api.updateTask(id, payload);
      await load();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="content">
      {confirmation && (
        <ConfirmDialog
          message={confirmation.message}
          allowNote
          onCancel={() => setConfirmation(null)}
          onConfirm={(note) => { setConfirmation(null); confirmation.onConfirm(note); }}
        />
      )}
      {error && <div className="banner banner-error">{error}</div>}
      <div className="page-heading">
        <div>
          <div className="section-label">OPEN REQUESTS</div>
          <h1 className="page-title">Browse tasks</h1>
        </div>
        <Link
          className={`btn btn-complete ${onboardingChoice === "post" ? "onboarding-pulse" : ""}`}
          to="/post"
          style={{ textDecoration: 'none' }}
          onClick={clearOnboardingPrompt}
        >
          <Plus size={15} /> Post a task
        </Link>
      </div>
      {!loading && (
        <div className="browser-search-wrap">
          <input
            className={`browser-search ${onboardingChoice === "browse" ? "onboarding-pulse" : ""}`}
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              clearOnboardingPrompt();
            }}
            placeholder="Search task titles"
            aria-label="Search task titles"
          />
        </div>
      )}
      {loading ? (
        <div className="loading-note">Loading tickets…</div>
      ) : visibleTasks.length === 0 ? (
        <div className="empty-note">{search.trim() ? `No open tasks match “${search.trim()}”` : "No tickets yet — post the first one."}</div>
      ) : (
        <>
          <div className="board">
            {visibleTasks.map((t) => (
              <Ticket
                key={t.id}
                task={t}
                currentUserId={user.id}
                onClaim={handleClaim}
                claimPending={!!pendingRequests[t.id]}
                onComplete={handleComplete}
                onUpdate={handleUpdate}
                anonymousClaim={!!anonymousClaims[t.id]}
                onAnonymousClaimChange={(anonymous) =>
                  setAnonymousClaims((claims) => ({ ...claims, [t.id]: anonymous }))
                }
                busy={busyId === t.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
