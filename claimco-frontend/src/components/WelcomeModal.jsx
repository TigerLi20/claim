export default function WelcomeModal({ open, onClose }) {
  if (!open) return null;
  return <div className="welcome-backdrop"><section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><div className="welcome-dialog-header"><h2 id="welcome-title">How Bruno Sells works</h2><button className="settings-close" onClick={onClose}>×</button></div><ul className="welcome-rules"><li>Browse or list secondhand items near Brown.</li><li>Use in-app chat to arrange a handoff and payment directly with the other person.</li><li>Sellers update a listing to pending or sold themselves.</li></ul><p>Bruno Sells is independent of Brown University and does not process payments.</p><button className="btn btn-complete" onClick={onClose}>Got it</button></section></div>;
}
