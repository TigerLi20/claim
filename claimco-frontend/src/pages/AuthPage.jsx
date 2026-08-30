import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CONCENTRATIONS = [
  "Africana Studies",
  "American Studies",
  "Anthropology",
  "Applied Mathematics",
  "Applied Mathematics-Biology",
  "Applied Mathematics-Computer Science",
  "Applied Mathematics-Economics",
  "Archaeology and the Ancient World",
  "Architecture",
  "Astronomy",
  "Behavioral Decision Sciences",
  "Biochemistry & Molecular Biology",
  "Biology",
  "Biomedical Engineering",
  "Biophysics",
  "Chemical Engineering",
  "Chemical Physics",
  "Chemistry",
  "Classics",
  "Cognitive Neuroscience",
  "Cognitive Science",
  "Comparative Literature",
  "Computational Biology",
  "Computational Chemistry and Chemical Physics",
  "Computational Neuroscience",
  "Computer Engineering",
  "Computer Science",
  "Computer Science-Economics",
  "Contemplative Studies",
  "Critical Native American and Indigenous Studies",
  "Design Engineering",
  "Early Modern World",
  "Earth and Planetary Science",
  "Earth, Climate, and Biology",
  "East Asian Studies",
  "Economics",
  "Education Studies",
  "Egyptology and Assyriology",
  "Electrical Engineering",
  "Engineering",
  "Engineering and Physics",
  "English",
  "Environmental Engineering",
  "Environmental Sciences and Studies",
  "Ethnic Studies",
  "French and Francophone Studies",
  "Gender and Sexuality Studies",
  "Geochemistry and Environmental Chemistry",
  "Geophysics and Climate Physics",
  "German Studies",
  "Graduate School",
  "Health & Human Biology",
  "Hispanic Literatures and Cultures",
  "History",
  "History of Art and Architecture",
  "Independent Concentration",
  "International and Public Affairs",
  "Italian Studies",
  "Judaic Studies",
  "Latin American and Caribbean Studies",
  "Linguistics",
  "Literary Arts",
  "Materials Engineering",
  "Mathematics",
  "Mathematics-Computer Science",
  "Mathematics-Economics",
  "Mechanical Engineering",
  "Medieval Cultures",
  "Middle East Studies",
  "Modern Culture and Media",
  "Music",
  "Neuroscience",
  "Philosophy",
  "Physics",
  "Physics and Philosophy",
  "Political Science",
  "Portuguese and Brazilian Studies",
  "Psychology",
  "Public Health",
  "Religious Studies",
  "School of Professional Studies",
  "Science, Technology, and Society",
  "Slavic Studies",
  "Social Analysis and Research",
  "Sociology",
  "South Asian Studies",
  "Statistics",
  "Theatre Arts and Performance Studies",
  "The Warren Alpert Medical School",
  "Urban Studies",
  "Visual Art",
];

export default function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get("mode") === "register" ? "register" : "login");
  const [screen, setScreen] = useState("auth"); // 'auth' or 'verify'

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", code: "", codeSent: false });

  // Register form
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    year: "freshman",
    concentration: "",
  });

  // Verification form
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, register, verifyEmail, resendCode, requestLoginCode, pendingUserId, pendingEmail, clearPending } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const nextMode = searchParams.get("mode") === "register" ? "register" : "login";
    setMode(nextMode);
  }, [searchParams]);

  useEffect(() => {
    // If we have a pending user, show verification screen
    if (pendingUserId) {
      setScreen("verify");
    }
  }, [pendingUserId]);

  // Resend cooldown timer
  const [loginResendCooldown, setLoginResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (loginResendCooldown > 0) {
      const timer = setTimeout(() => setLoginResendCooldown(loginResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [loginResendCooldown]);

  // Clean up pending registration when user navigates away (browser back, close tab, etc.)
  useEffect(() => {
    if (screen === "verify" && pendingUserId) {
      const handleBeforeUnload = () => {
        // Fire cleanup async (don't wait for it to complete)
        clearPending().catch(err => console.error("Failed to cleanup pending registration:", err));
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [screen, pendingUserId, clearPending]);

  // Additional cleanup for browser back navigation (catches cases where beforeunload doesn't complete)
  useEffect(() => {
    return () => {
      // This runs when component unmounts. If we're still in verify state with a pending user,
      // it means we're navigating away without completing verification.
      if (screen === "verify" && pendingUserId) {
        clearPending().catch(err => console.error("Failed to cleanup pending registration on unmount:", err));
      }
    };
  }, [screen, pendingUserId, clearPending]);

  function updateMode(nextMode) {
    setMode(nextMode);
    setError("");
    setScreen("auth");
    const params = new URLSearchParams(searchParams);
    params.set("mode", nextMode);
    setSearchParams(params, { replace: true });
  }

  async function onRegister(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // Validate concentration
      if (!registerForm.concentration) {
        throw new Error("Please select a concentration");
      }

      // Validate phone number format (basic)
      const phoneRegex = /^\+?1?\d{10,}$/;
      if (!phoneRegex.test(registerForm.phoneNumber.replace(/\D/g, ""))) {
        throw new Error("Please enter a valid phone number");
      }

      await register({
        name: registerForm.name,
        email: registerForm.email,
        phoneNumber: registerForm.phoneNumber,
        year: registerForm.year,
        concentration: registerForm.concentration,
      });

      // Screen will automatically switch to verification via useEffect
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!verificationCode) {
        throw new Error("Please enter the verification code");
      }

      await verifyEmail(pendingUserId, verificationCode);
      // Set flags for first-time onboarding flow
      sessionStorage.setItem("claimco_pending_onboarding", "1");
      sessionStorage.setItem("claimco_show_welcome", "1");
      window.dispatchEvent(new CustomEvent("welcome-guide-available"));
      navigate("/board");
    } catch (err) {
      setError(err.message);
      setVerificationCode("");
    } finally {
      setBusy(false);
    }
  }

  async function onResendCode() {
    setError("");
    setBusy(true);
    try {
      await resendCode(pendingUserId);
      setResendCooldown(60); // 60 second cooldown
      setError(""); // Clear any previous error
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onBackToAuth() {
    await clearPending();
    setScreen("auth");
    setVerificationCode("");
    setError("");
  }

  async function onRequestLoginCode(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!loginForm.email) {
        throw new Error("Please enter your Brown email");
      }

      await requestLoginCode(loginForm.email);
      setLoginForm({ ...loginForm, codeSent: true, code: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onResendLoginCode() {
    setError("");
    setBusy(true);
    try {
      await requestLoginCode(loginForm.email);
      setLoginResendCooldown(60); // 60 second cooldown
      setError(""); // Clear any previous error
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!loginForm.email || !loginForm.code) {
        throw new Error("Please enter your Brown email and the 6-digit verification code");
      }

      await login({ email: loginForm.email, code: loginForm.code });
      navigate("/board");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Verification screen
  if (screen === "verify") {
    return (
      <div className="auth-page-shell">
        <header className="auth-header">
          <div className="auth-header-inner">
            <div className="brand-lockup" aria-label="Claim home">
              <span className="brand-word">Claim</span>
            </div>
          </div>
        </header>

        <main className="auth-main">
          <section className="auth-panel" aria-label="Email verification panel">
            <div className="auth-kicker">Verify your email</div>

            <div className="auth-headline-wrap">
              <h1>Check your email</h1>
              <p>
                We sent a verification code to <strong>{pendingEmail}</strong>. Enter it below to activate your account.
              </p>
            </div>

            {error && <div className="banner banner-error">{error}</div>}

            <form onSubmit={onVerify} className="auth-form">
              <div className="field-group">
                <label htmlFor="verification-code">Verification code</label>
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="auth-inline-row-verify">
                <button
                  type="button"
                  className="auth-ghost-link"
                  onClick={onResendCode}
                  disabled={busy || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  className="auth-ghost-link"
                  onClick={onBackToAuth}
                >
                  Back
                </button>
              </div>

              <button className="auth-submit" type="submit" disabled={busy || verificationCode.length < 6}>
                {busy ? "Verifying…" : "Verify email"}
              </button>
            </form>
          </section>
        </main>

        <footer className="auth-footer">
          <div className="auth-trust-strip">
            <div className="auth-trust-item">
              <strong>1,400+</strong>
              <span>campus users</span>
            </div>
            <div className="auth-trust-item">
              <strong>3,900+</strong>
              <span>tasks and sessions</span>
            </div>
            <div className="auth-trust-item">
              <strong>4.9 / 5</strong>
              <span>avg. rating</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Main auth screen (login or register)
  return (
    <div className="auth-page-shell">
      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="brand-lockup" aria-label="Claim home">
            <span className="brand-word">Claim</span>
          </div>

          <button
            type="button"
            className="auth-header-link"
            onClick={() => updateMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-panel" aria-label="Account access panel">
          <div className="auth-kicker">Campus access</div>

          <div className="auth-toggle" aria-label="Authentication mode tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => updateMode("login")} type="button">
              Sign in
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => updateMode("register")} type="button">
              Register
            </button>
          </div>

          <div className="auth-headline-wrap">
            <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p>
              {mode === "login"
                ? "Use your Brown email and the 6-digit code we send you."
                : "Takes under a minute. Campus email verification required."}
            </p>
          </div>

          {error && <div className="banner banner-error">{error}</div>}

          <form onSubmit={mode === "register" ? onRegister : (loginForm.codeSent ? onLogin : onRequestLoginCode)} className="auth-form">
            {mode === "register" && (
              <div className="field-group">
                <label htmlFor="auth-name">First name</label>
                <input
                  id="auth-name"
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  placeholder="Maya"
                  required
                />
              </div>
            )}

            {mode === "login" ? (
              <div className="field-group">
                <label htmlFor="auth-email">Brown email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="firstname_lastname@brown.edu"
                  required
                  autoComplete="email"
                />
              </div>
            ) : (
              <div className="field-group">
                <label htmlFor="auth-email">Brown email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="firstname_lastname@brown.edu"
                  required
                  autoComplete="email"
                />
              </div>
            )}

            {mode === "register" && (
              <>
                <div className="field-group">
                  <label htmlFor="auth-phone">Phone number</label>
                  <input
                    id="auth-phone"
                    type="tel"
                    value={registerForm.phoneNumber}
                    onChange={(e) => setRegisterForm({ ...registerForm, phoneNumber: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    required
                    autoComplete="tel"
                  />
                </div>

                <div className="field-row">
                  <div className="field-group">
                    <label htmlFor="auth-year">Year</label>
                    <select
                      id="auth-year"
                      value={registerForm.year}
                      onChange={(e) => setRegisterForm({ ...registerForm, year: e.target.value })}
                      required
                    >
                      <option value="freshman">Freshman</option>
                      <option value="sophomore">Sophomore</option>
                      <option value="junior">Junior</option>
                      <option value="senior">Senior</option>
                      <option value="grad">Graduate</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label htmlFor="auth-concentration">Concentration</label>
                    <select
                      id="auth-concentration"
                      value={registerForm.concentration}
                      onChange={(e) => setRegisterForm({ ...registerForm, concentration: e.target.value })}
                      required
                    >
                      <option value="">Select a concentration</option>
                      {CONCENTRATIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {mode === "login" && loginForm.codeSent && (
              <div className="field-group">
                <label htmlFor="auth-code">Verification code</label>
                <input
                  id="auth-code"
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  value={loginForm.code}
                  onChange={(e) => setLoginForm({ ...loginForm, code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  placeholder="000000"
                  required
                />
              </div>
            )}

            {mode === "login" && loginForm.codeSent && (
              <div className="auth-inline-row">
                <button
                  type="button"
                  className="auth-ghost-link"
                  onClick={onResendLoginCode}
                  disabled={busy || loginResendCooldown > 0}
                >
                  {loginResendCooldown > 0 ? `Resend in ${loginResendCooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  className="auth-ghost-link"
                  onClick={() => {
                    setLoginForm({ ...loginForm, codeSent: false, code: "" });
                    setError("");
                  }}
                >
                  Change email
                </button>
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? (loginForm.codeSent ? "Log in" : "Send login code") : "Create account"}
            </button>
          </form>

          <div className="auth-switch">
            {mode === "login" ? "New to Claim?" : "Already have an account?"} {" "}
            <button type="button" onClick={() => updateMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </section>
      </main>

      <footer className="auth-footer">
        <div className="auth-trust-strip">
          <div className="auth-trust-item">
            <strong>1,400+</strong>
            <span>campus users</span>
          </div>
          <div className="auth-trust-item">
            <strong>3,900+</strong>
            <span>tasks and sessions</span>
          </div>
          <div className="auth-trust-item">
            <strong>4.9 / 5</strong>
            <span>avg. rating</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
