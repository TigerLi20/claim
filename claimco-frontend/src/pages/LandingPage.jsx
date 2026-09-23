import { ArrowRight, MessageCircle, ShieldCheck, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { label: "Clothing", id: "clothing" }, { label: "Books", id: "books" },
  { label: "Furniture", id: "furniture" }, { label: "Electronics", id: "electronics" },
  { label: "Home", id: "home" }, { label: "More finds", id: "" },
];

export default function LandingPage() {
  return <div className="landing-page">
    <header className="landing-header"><div className="landing-wrap landing-nav-wrap">
      <Link className="landing-logo" to="/">Bruno <span>Sells</span></Link>
      <nav className="landing-nav" aria-label="Main navigation"><Link to="/login">Log in</Link><Link className="landing-btn landing-btn-primary" to="/login?mode=register">Join Bruno Sells <ArrowRight size={16} /></Link></nav>
    </div></header>
    <main>
      <section className="landing-hero landing-wrap">
        <div className="landing-hero-copy"><div className="landing-eyebrow">THE MARKETPLACE AROUND BROWN</div><h1>Find your<br /><em>next favorite.</em></h1><p>Good things deserve a second life. Shop and sell clothes, books, furniture, and more with verified students nearby.</p><div className="landing-ctas"><Link className="landing-btn landing-btn-primary" to="/board">Explore items <ArrowRight size={18} /></Link><Link className="landing-btn landing-btn-ghost" to="/post">Start selling</Link></div><div className="landing-note"><ShieldCheck size={17} /> School email required to message or sell</div></div>
        <div className="landing-hero-image" role="img" aria-label="Secondhand books, clothing, lamp, camera and headphones"><div className="landing-hero-sticker">Preloved finds.<br />Fresh stories.</div></div>
      </section>
      <section className="landing-category-section landing-wrap"><div className="landing-section-head"><div><div className="landing-eyebrow">A LITTLE BIT OF EVERYTHING</div><h2>Find your kind of thing.</h2></div><Link to="/board">Explore all <ArrowRight size={17} /></Link></div><div className="landing-categories">{categories.map((category, index) => <Link className={`landing-category landing-category-${index + 1}`} key={category.id || "all"} to={category.id ? `/board?category=${category.id}` : "/board"}><span>{category.label}</span><ArrowRight size={18} /></Link>)}</div></section>
      <section className="landing-how"><div className="landing-wrap"><div className="landing-section-head"><div><div className="landing-eyebrow">HOW BRUNO SELLS WORKS</div><h2>From listing to new home.</h2></div></div><div className="landing-steps"><article><ShoppingBag size={25} /><span>01</span><h3>Discover or list</h3><p>Browse local finds or post your own item with a price and up to three photos.</p></article><article><MessageCircle size={25} /><span>02</span><h3>Start a conversation</h3><p>Ask questions and arrange the details in a chat dedicated to that item.</p></article><article><ShieldCheck size={25} /><span>03</span><h3>Meet up locally</h3><p>Choose a handoff and pay each other directly. Sellers mark items sold.</p></article></div></div></section>
      <section className="landing-final landing-wrap"><div><div className="landing-eyebrow">READY WHEN YOU ARE</div><h2>Make space for what’s next.</h2></div><Link className="landing-btn landing-btn-light" to="/login?mode=register">Join the marketplace <ArrowRight size={18} /></Link></section>
    </main><footer className="landing-footer"><div className="landing-wrap landing-footer-inner"><strong>Bruno <span>Sells</span></strong><span>Secondhand finds around Brown.</span><span>Independent of and not affiliated with Brown University.</span></div></footer>
  </div>;
}
