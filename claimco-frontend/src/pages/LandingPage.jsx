import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LandingPage() {
    const { user } = useAuth();

    if (user) {
        return <Navigate to="/board" replace />;
    }

    return (
        <div className="landing-page">
            <header className="landing-header">
                <div className="landing-wrap landing-nav-wrap">
                    <div className="landing-logo" aria-label="Claim home">
                        <span>Claim</span>
                    </div>

                    <nav className="landing-nav" aria-label="Main navigation">
                        <a href="#how">How it works</a>
                        <a href="#features">Features</a>
                        <a href="#stories">Reviews</a>
                    </nav>

                    <Link to="/login" className="landing-nav-cta">
                        Sign in
                    </Link>
                </div>
            </header>

            <main>
                <section className="landing-hero">
                    <div className="landing-wrap landing-hero-layout">
                        <div className="landing-copy">
                            <div className="landing-eyebrow">Campus help · tutoring · everyday tasks</div>
                            <h1>
                                Need a hand on campus?<br />
                                Get help from <em>a fellow student.</em>
                            </h1>

                            <p className="landing-subhead">
                                Claim connects students at Brown who need support with students who can help — from tutoring and exam prep to quick errands, move-out help, and the small tasks that pile up mid-semester.
                            </p>

                            <div className="landing-ctas">
                                <Link to="/login?mode=register" className="landing-btn landing-btn-primary">
                                    Get tutoring
                                </Link>
                                <Link to="/login?mode=register" className="landing-btn landing-btn-ghost">
                                    Offer help
                                </Link>
                            </div>

                            <div className="landing-note">
                                Join with your campus email and start helping or getting help in minutes.
                            </div>
                        </div>

                        <div className="landing-card-stack" aria-label="Example tasks and tutoring offers">
                            <div className="landing-index-card landing-card-3">
                                <div className="landing-code">TASK · 220</div>
                                <h4>Move-out help, dorm pickup</h4>
                                <p>Need two people for a quick Saturday move-out and a few boxes to the car.</p>
                                <div className="landing-foot">
                                    <span>Posted 12m ago</span>
                                    <span>$25/hr</span>
                                </div>
                            </div>

                            <div className="landing-index-card landing-card-2">
                                <div className="landing-code">HELP · Career</div>
                                <h4>Resume feedback before interviews</h4>
                                <p>Need a final pass on my experience section and cover letter notes.</p>
                                <div className="landing-foot">
                                    <span>3 offers</span>
                                    <span>$20</span>
                                </div>
                            </div>

                            <div className="landing-index-card landing-card-1">
                                <div className="landing-code">TUTOR · CSCI0150</div>
                                <h4>CS15 midterm review sessions</h4>
                                <p>I can help walkthrough loops, recursion, and exam strategy before Thursday's midterm!</p>
                                <div className="landing-foot">
                                    <span>★ 4.9 · Maya</span>
                                    <span>$30/session</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="landing-strip">
                    <div className="landing-wrap landing-strip-inner">
                        <div className="landing-strip-item">
                            <strong>Every</strong>
                            listing comes from a real classmate
                        </div>
                        <div className="landing-strip-item">
                            <strong>$0</strong>
                            platform fees
                        </div>
                        <div className="landing-strip-item">
                            <strong>4.8 / 5</strong>
                            average helper rating
                        </div>
                        <div className="landing-strip-item">
                            <strong>Verified</strong>
                            with your @campus.edu email
                        </div>
                    </div>
                </div>

                <section className="landing-section" id="how">
                    <div className="landing-wrap">
                        <div className="landing-section-head">
                            <div className="landing-eyebrow">How it works</div>
                            <h2>Two sides of the same campus help network</h2>
                            <p>Whether you need support or want to earn from what you already know, Claim keeps the flow simple.</p>
                        </div>

                        <div className="landing-ledger">
                            <div className="landing-ledger-row">
                                <div className="landing-code">01</div>
                                <div>
                                    <h3>Post what you need — or list what you offer</h3>
                                    <p>Set a tutoring session, a beauty service (nails, hair), or quick task you can help with in under a minute.</p>
                                </div>
                                <div className="landing-ledger-tag">For both sides</div>
                            </div>

                            <div className="landing-ledger-row">
                                <div className="landing-code">02</div>
                                <div>
                                    <h3>Match with a trusted campus peer</h3>
                                    <p>Browse profiles, ratings, and reviews before you commit. Chat in-app to lock in the details.</p>
                                </div>
                                <div className="landing-ledger-tag">Trust layer</div>
                            </div>

                            <div className="landing-ledger-row">
                                <div className="landing-code">03</div>
                                <div>
                                    <h3>Get it done, leave a review</h3>
                                    <p>Once the session or task is complete, both parties may leave a review for each other and the community.</p>
                                </div>
                                <div className="landing-ledger-tag">Reviews</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="landing-section landing-section-topless" id="features">
                    <div className="landing-wrap">
                        <div className="landing-section-head">
                            <div className="landing-eyebrow">What’s on Claim</div>
                            <h2>Built for the way campus actually works</h2>
                        </div>

                        <div className="landing-features-grid">
                            <div className="landing-feature">
                                <div className="landing-feature-num">01</div>
                                <h3>Campus-only, verified</h3>
                                <p>Use your campus email to keep the marketplace focused on students and real local trust.</p>
                            </div>

                            <div className="landing-feature">
                                <div className="landing-feature-num">02</div>
                                <h3>Tutoring by subject</h3>
                                <p>Search for help by class, department, skill, or area of expertise instead of vague requests.</p>
                            </div>

                            <div className="landing-feature">
                                <div className="landing-feature-num">03</div>
                                <h3>One-off tasks</h3>
                                <p>Move-out weekend, errands, life admin, and quick fixes — post it once and let helpers come to you.</p>
                            </div>

                            <div className="landing-feature">
                                <div className="landing-feature-num">04</div>
                                <h3>Beauty services</h3>
                                <p>Hair, nails, and other beauty services offered by skilled peers right on campus — book and pay in one place.</p>
                            </div>

                            <div className="landing-feature">
                                <div className="landing-feature-num">05</div>
                                <h3>Reviews & profiles</h3>
                                <p>Every helper carries a rating and history from real peers, not anonymous strangers.</p>
                            </div>

                            <div className="landing-feature">
                                <div className="landing-feature-num">06</div>
                                <h3>In-app chat</h3>
                                <p>Coordinate timing, instructions, and details without sharing personal contact info too early.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="landing-testimonials" id="stories">
                    <div className="landing-wrap">
                        <div className="landing-section-head landing-section-head-light">
                            <div className="landing-eyebrow">From the campus</div>
                            <h2>What students are saying</h2>
                            <p>Real stories from people using Claim to get help and make money.</p>
                        </div>

                        <div className="landing-testimonial-grid">
                            <div className="landing-testimonial-card">
                                <p className="landing-quote">“I needed a CS tutor two days before the midterm. Found one within the hour, and they had already taken the class with the same professor.”</p>
                                <div className="landing-persona">
                                    <div className="landing-avatar">MT</div>
                                    <div>
                                        <div className="landing-name">Tyler L.</div>
                                        <div className="landing-meta">Computer Science</div>
                                    </div>
                                </div>
                            </div>

                            <div className="landing-testimonial-card">
                                <p className="landing-quote">“I make more tutoring calculus on Claim than I did at my old work-study job — and I set my own hours around my schedule.”</p>
                                <div className="landing-persona">
                                    <div className="landing-avatar">DR</div>
                                    <div>
                                        <div className="landing-name">Maya T.</div>
                                        <div className="landing-meta">Applied Math</div>
                                    </div>
                                </div>
                            </div>

                            <div className="landing-testimonial-card">
                                <p className="landing-quote">“Way less awkward than posting in a class group chat and hoping someone responds. You can actually see who you’re getting help from.”</p>
                                <div className="landing-persona">
                                    <div className="landing-avatar">PS</div>
                                    <div>
                                        <div className="landing-name">Sophia S.</div>
                                        <div className="landing-meta">Undeclared</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="landing-cta">
                    <div className="landing-wrap landing-cta-box">
                        <h2>Your next helper is already on campus.</h2>
                        <p>Join in under two minutes and start getting or giving support.</p>
                        <div className="landing-ctas landing-cta-actions">
                            <Link to="/login?mode=register" className="landing-btn landing-btn-primary">
                                Post a task
                            </Link>
                            <Link to="/login?mode=register" className="landing-btn landing-btn-ghost">
                                Browse tutors
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="landing-wrap landing-footer-inner">
                    <div className="landing-logo landing-footer-logo">
                        <span>Claim</span>
                    </div>
                    <div className="landing-footer-note">Built for campus communities. Not officially affiliated with any single university.</div>
                </div>
            </footer>
        </div>
    );
}
