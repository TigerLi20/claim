import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import WelcomeModal from "./components/WelcomeModal";
import FirstTimeOnboardingModal from "./components/FirstTimeOnboardingModal";
import AuthPage from "./pages/AuthPage";
import Board from "./pages/Board";
import PostTask from "./pages/PostTask";
import MyTickets from "./pages/MyTickets";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import OfferService from "./pages/OfferService";
import Account from "./pages/Account";
import TaskDetail from "./pages/TaskDetail";
import ServiceDetail from "./pages/ServiceDetail";
import PublicProfile from "./pages/PublicProfile";
import ReviewPage from "./pages/ReviewPage";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import ServiceInstanceDetail from "./pages/ServiceInstanceDetail";
import Help from "./pages/Help";
import LandingPage from "./pages/LandingPage";
import AdminInbox from "./pages/AdminInbox";
import { useAuth } from "./context/AuthContext";

const tabTitles = {
  "/": "Home",
  "/login": "Login",
  "/board": "Browse tickets",
  "/post": "Post a task",
  "/mine": "My tickets",
  "/dashboard": "My stats",
  "/services": "Tutoring",
  "/offer": "Offer tutoring",
  "/account": "Account",
  "/messages": "Messages",
  "/chat": "Chat",
  "/help": "Help",
};

export default function App() {
  const { ready, user } = useAuth();
  const location = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);
  const showFirstTimeOnboarding = !!user && sessionStorage.getItem("claimco_pending_onboarding") === "1";

  useEffect(() => {
    const pathname = location.pathname;
    const routeTitle = Object.entries(tabTitles).find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1];
    const fallbackTitle = pathname.startsWith("/tasks/")
      ? "Task"
      : pathname.startsWith("/services/")
        ? "Tutoring"
        : pathname.startsWith("/users/")
          ? "Profile"
          : pathname.startsWith("/reviews/")
            ? "Review"
            : pathname.startsWith("/service-instances/")
              ? "Tutoring instance"
              : "Claim";

    document.title = user ? `Claim - ${routeTitle || fallbackTitle}` : `Claim - ${routeTitle || "Home"}`;
  }, [location.pathname, user]);

  useEffect(() => {
    if (!user) {
      setShowWelcome(false);
      return;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handleReviewWelcome = () => {
      setShowWelcome(true);
      sessionStorage.removeItem("claimco_show_welcome");
    };

    const handleOpenWelcomeGuide = () => {
      setShowWelcome(true);
      sessionStorage.removeItem("claimco_show_welcome");
    };

    window.addEventListener("review-welcome", handleReviewWelcome);
    window.addEventListener("open-welcome-guide", handleOpenWelcomeGuide);
    return () => {
      window.removeEventListener("review-welcome", handleReviewWelcome);
      window.removeEventListener("open-welcome-guide", handleOpenWelcomeGuide);
    };
  }, [user]);

  if (!ready) return null;

  return (
    <div className="app-shell">
      <NavBar />
      <WelcomeModal open={showWelcome} onClose={() => {
        setShowWelcome(false);
        sessionStorage.removeItem("claimco_show_welcome");
      }} />
      <FirstTimeOnboardingModal open={showFirstTimeOnboarding} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/board"
          element={
            <ProtectedRoute>
              <Board />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post"
          element={
            <ProtectedRoute>
              <PostTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mine"
          element={
            <ProtectedRoute>
              <MyTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <Services />
            </ProtectedRoute>
          }
        />
        <Route
          path="/offer"
          element={
            <ProtectedRoute>
              <OfferService />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
        <Route path="/services/:id" element={<ProtectedRoute><ServiceDetail /></ProtectedRoute>} />
        <Route path="/service-instances/:id" element={<ProtectedRoute><ServiceInstanceDetail /></ProtectedRoute>} />
        <Route path="/users/:id" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
        <Route path="/reviews/:kind/:id" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/chat/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminInbox />} />
        <Route path="*" element={<Navigate to={user ? "/board" : "/"} replace />} />
      </Routes>
    </div>
  );
}
