export const welcomeRules = [
  {
    title: "Connection only.",
    description:
      "Claim connects people and helps them coordinate. As of now, money is handled directly between the two parties, not through the platform.",
  },
  {
    title: "Start simple.",
    description:
      "Post a task if you need help, or offer tutoring if you can help. Keep it clear: what needs to happen, by when, and any important details.",
  },
  {
    title: "Request a claim when ready.",
    description:
      "Only request a claim after reading through a task or tutoring offer thoroughly.",
  },
  {
    title: "Mark fulfilled when complete.",
    description:
      "Once the agreed work is done and both sides are satisfied, mark it fulfilled to close the task and start the review flow.",
  },
];

export default function WelcomeModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="welcome-backdrop" role="presentation">
      <section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-dialog-title">
        <div className="welcome-dialog-header">
          <div className="welcome-header-copy">
            <div className="section-label welcome-label">WELCOME!</div>
            <h2 id="welcome-dialog-title">Here’s how Claim works</h2>
          </div>
          <button type="button" className="settings-close" aria-label="Close welcome guide" onClick={onClose}>
            ×
          </button>
        </div>

        <ul className="welcome-rules">
          {welcomeRules.map((rule) => (
            <li key={rule.title} className="welcome-rule-item">
              <strong>{rule.title}</strong>
              <span>{rule.description}</span>
            </li>
          ))}
        </ul>

        <p className="welcome-faq-note">Have more questions? Check our FAQs page.</p>

        <div className="welcome-actions">
          <button type="button" className="btn btn-complete btn-full" onClick={onClose}>
            Got it
          </button>
        </div>
      </section>
    </div>
  );
}
