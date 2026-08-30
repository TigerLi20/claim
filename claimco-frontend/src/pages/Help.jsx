const faqItems = [
  {
    question: "How do I post a task on Claim?",
    answer:
      "From the main tabs, go to Post a task. Add a clear title, details about the job, your preferred timeline, and any budget or conditions. Once you publish it, other students can browse and respond to it.",
  },
  {
    question: "What is the difference between posting a task and offering tutoring?",
    answer:
      "Posting a task means you are asking for help with something you need done. Offering tutoring means you are listing the help you can provide to others. The app supports both sides of the marketplace, so you can either ask for help or offer it.",
  },
  {
    question: "How do I message someone about a task or tutoring offer?",
    answer:
      "You can attach a short message whenever you request to claim a task or tutoring service. For any task or tutoring service you have claimed that has been confirmed, you can go to the message tab to start a conversation with your new connection. From there you can coordinate details, timing, and any other necessary arrangements.",
  },
  {
    question: "What happens when I confirm an anonymous request?",
    answer:
      "When you confirm an anonymous request, the confirmation goes through as normal, and you will be able to see that person's real profile information, now that you have commited to them. This is intended to protect their identity if you were to have not confirmed them.",
  },
  {
    question: "Can I edit or remove a task after it is posted?",
    answer:
      "Yes, if you still have the task open you can usually update details from the task page or your ticket list. If someone has already started working on it or it is in progress, the safest option is to contact the other person through chat before making changes.",
  },
  {
    question: "How do I know if someone is trustworthy?",
    answer:
      "Use the profile, reviews, class year, concentration (a real concentration), and history of completed work as signals. The messaging system and review flow are built to help both sides confirm expectations before and after the transaction.",
  },
  {
    question: "What does it mean to fulfill a task or tutoring offer?",
    answer:
      "Fulfilment is the point where the agreed work gets completed. Once a task or tutoring offer has been delivered, both parties can confirm completion and leave a review so the community can better judge reliability.",
  },
  {
    question: "How do reviews work?",
    answer:
      "After completion, both sides can leave feedback. These reviews help future students understand whether a person is responsive, reliable, and fair. Good reviews build credibility and make it easier to get help or find work.",
  },
  {
    question: "How do I pay for a task or tutoring offer?",
    answer:
      "For now, payments are handled directly between the two people involved in the task or tutoring offer. The app helps you coordinate and confirm the agreement, but the transaction itself is done between the people using the platform. In the future, we hope to integrate convenient and secure payment options directly into the platform.",
  },
  {
    question: "What if I need help with something not covered here?",
    answer:
      "Use the app’s FAQs page and chat with other users to clear up any issues or confusions that may occur. Your FAQs page and chat tools are the fastest way to clarify details before moving forward.",
  },
];

import ContactDevsForm from "../components/ContactDevsForm";

export default function Help() {
  return (
    <div className="content faq-page">
      <div className="page-heading">
        <div>
          <div className="section-label">HELP & FAQs (contact dev team at bottom)</div>
          <h1 className="page-title">Frequently asked questions</h1>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => {
          window.dispatchEvent(new Event("review-welcome"));
        }}>
          Review Welcome
        </button>
      </div>

      <div className="faq-list">
        {faqItems.map((item) => (
          <article className="faq-item" key={item.question}>
            <h2 className="faq-question">{item.question}</h2>
            <p className="faq-answer">{item.answer}</p>
          </article>
        ))}
      </div>

      <div style={{ marginTop: 60, display: 'flex', justifyContent: 'center' }}>
        <ContactDevsForm />
      </div>
    </div>
  );
}
