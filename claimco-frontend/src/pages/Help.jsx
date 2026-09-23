const faqs = [
  ["How do I sell an item?", "Select Sell an item, add a title, description, price, condition, category, and up to three photos. Your listing will appear on the board."],
  ["How do I contact a seller?", "Open an item and select Message seller. Each item gets its own conversation, even if you have chatted with that seller before."],
  ["How do I pay?", "Arrange payment directly with the seller, such as cash or Venmo. Bruno Sells does not collect or transfer money."],
  ["How do I mark something sold?", "Open your listing and set its status to pending or sold. You can also set it back to available."],
  ["Is Bruno Sells affiliated with Brown University?", "No. Bruno Sells is an independent marketplace for people in the Brown area. A school email is required to join."],
];
export default function Help() { return <main className="content faq-page"><div className="page-heading"><div><div className="section-label">HELP</div><h1 className="page-title">Frequently asked questions</h1></div><button className="btn btn-secondary" onClick={() => window.dispatchEvent(new Event("show-welcome-guide"))}>Review welcome</button></div><div className="faq-list">{faqs.map(([q,a]) => <article className="faq-item" key={q}><h2 className="faq-question">{q}</h2><p className="faq-answer">{a}</p></article>)}</div></main>; }
