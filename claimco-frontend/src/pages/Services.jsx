import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HandHelping, Plus } from "lucide-react";
import { api } from "../api/client";
import Service from "../components/Service";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Services() {
    const location = useLocation();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [confirmation, setConfirmation] = useState(null);
    const [search, setSearch] = useState("");
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
    const visibleServices = normalizedSearch
        ? services.filter((service) => String(service.title || "").toLowerCase().includes(normalizedSearch))
        : services;

    async function load() {
        setLoading(true);
        setError("");
        try {
            setServices(await api.listServices());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function submitDeactivate(id) {
        setBusyId(id);
        setError("");
        try {
            await api.deactivateService(id);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    }

    async function handleDeactivate(id) {
        setConfirmation({
            message: "Pause this tutoring offer? Any pending claim requests will be automatically declined.",
            onConfirm: () => submitDeactivate(id),
            allowNote: false,
        });
    }

    async function handleUpdate(id, payload) {
        setBusyId(id);
        setError("");
        try {
            await api.updateService(id, payload);
            await load();
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setBusyId(null);
        }
    }

    async function handlePurchase(id) {
        setConfirmation({
            message: "Are you sure you want to request to claim this tutoring offer?",
            onConfirm: (note) => submitPurchase(id, note),
            allowNote: true,
        });
    }

    async function submitPurchase(id, note) {
        setBusyId(id);
        setError("");
        try {
            await api.purchaseService(id, note);
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="content">
            {confirmation && (
                <ConfirmDialog
                    message={confirmation.message}
                    allowNote={!!confirmation.allowNote}
                    onCancel={() => setConfirmation(null)}
                    onConfirm={(note) => { setConfirmation(null); confirmation.onConfirm(note); }}
                />
            )}
            <div className="page-heading">
                <div>
                    <div className="section-label">ONGOING TUTORING</div>
                    <h1 className="page-title">Tutoring</h1>
                    <p className="page-intro">Find students who can help with the topics that matter most.</p>
                </div>
                <Link
                    className={`btn btn-complete ${onboardingChoice === "offer" ? "onboarding-pulse" : ""}`}
                    to="/offer"
                    style={{ textDecoration: 'none' }}
                    onClick={clearOnboardingPrompt}
                ><Plus size={15} /> Offer tutoring</Link>
            </div>
            {!loading && (
                <div className="browser-search-wrap">
                    <input
                        className={`browser-search ${onboardingChoice === "tutoring" ? "onboarding-pulse" : ""}`}
                        type="text"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            clearOnboardingPrompt();
                        }}
                        placeholder="Search classes, exams, disciplines"
                        aria-label="Search classes, exams, disciplines"
                    />
                </div>
            )}
            {error && <div className="banner banner-error">{error}</div>}
            {loading ? (
                <div className="loading-note">Loading tutoring…</div>
            ) : visibleServices.length === 0 ? (
                <div className="empty-note">{search.trim() ? `No tutoring matches “${search.trim()}”` : <><HandHelping size={18} /> No tutoring yet — offer the first one.</>}</div>
            ) : (
                <div className="service-grid">
                    {visibleServices.map((service) => (
                        <Service
                            key={service.id}
                            service={service}
                            onDeactivate={handleDeactivate}
                            onUpdate={handleUpdate}
                            onPurchase={handlePurchase}
                            busy={busyId === service.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
