import { useNavigate } from "react-router-dom";

const ONBOARDING_STORAGE_KEY = "claimco_pending_onboarding";
const ONBOARDING_CHOICE_STORAGE_KEY = "claimco_onboarding_choice";

function markChoice(choice) {
    sessionStorage.setItem(ONBOARDING_CHOICE_STORAGE_KEY, choice);
    sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

export default function FirstTimeOnboardingModal({ open }) {
    const navigate = useNavigate();

    if (!open) return null;

    function handleChoice(nextPath, target) {
        markChoice(target);
        sessionStorage.removeItem("claimco_show_welcome");
        window.dispatchEvent(new CustomEvent("onboarding-choice-updated"));
        navigate(nextPath);
    }

    return (
        <div className="welcome-backdrop" role="presentation">
            <section className="welcome-dialog onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-dialog-title">
                <div className="welcome-dialog-header">
                    <div className="welcome-header-copy">
                        <div className="section-label welcome-label">FIRST STEPS</div>
                        <h2 id="onboarding-dialog-title">Welcome! What do you want to do first?</h2>
                    </div>
                </div>

                <div className="onboarding-grid">
                    <button type="button" className="onboarding-choice" onClick={() => handleChoice("/board", "browse")}>
                        <span className="onboarding-choice-title">Find a task to fulfill</span>
                        <span className="onboarding-choice-copy">Browse open tickets and help someone out.</span>
                    </button>

                    <button type="button" className="onboarding-choice" onClick={() => handleChoice("/board", "post")}>
                        <span className="onboarding-choice-title">Post a task</span>
                        <span className="onboarding-choice-copy">Share what you need help with and let students reply.</span>
                    </button>

                    <button type="button" className="onboarding-choice" onClick={() => handleChoice("/services", "offer")}>
                        <span className="onboarding-choice-title">Offer tutoring</span>
                        <span className="onboarding-choice-copy">List the subjects or skills you can teach.</span>
                    </button>

                    <button type="button" className="onboarding-choice" onClick={() => handleChoice("/services", "tutoring")}>
                        <span className="onboarding-choice-title">Get tutoring</span>
                        <span className="onboarding-choice-copy">Find a tutor and book a session that fits your needs.</span>
                    </button>
                </div>
            </section>
        </div>
    );
}
