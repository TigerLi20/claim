import { useNavigate } from "react-router-dom";
export default function FirstTimeOnboardingModal({ open }) {
  const navigate = useNavigate();
  if (!open) return null;
  const choose = path => { sessionStorage.removeItem("claimco_pending_onboarding"); navigate(path); };
  return <div className="welcome-backdrop"><section className="welcome-dialog onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div className="section-label welcome-label">WELCOME</div><h2 id="onboarding-title">What would you like to do?</h2><div className="onboarding-grid"><button className="onboarding-choice" onClick={() => choose("/board")}><span className="onboarding-choice-title">Browse items</span><span className="onboarding-choice-copy">Find secondhand items from nearby students.</span></button><button className="onboarding-choice" onClick={() => choose("/post")}><span className="onboarding-choice-title">Sell an item</span><span className="onboarding-choice-copy">Post a listing with a price and photos.</span></button></div></section></div>;
}
