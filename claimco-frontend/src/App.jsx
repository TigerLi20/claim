import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import WelcomeModal from "./components/WelcomeModal";
import FirstTimeOnboardingModal from "./components/FirstTimeOnboardingModal";
import AuthPage from "./pages/AuthPage";
import Board from "./pages/Board";
import PostItem from "./pages/PostItem";
import ItemDetail from "./pages/ItemDetail";
import MyListings from "./pages/MyListings";
import Account from "./pages/Account";
import PublicProfile from "./pages/PublicProfile";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Help from "./pages/Help";
import LandingPage from "./pages/LandingPage";
import { useAuth } from "./context/AuthContext";
import { safeNext } from "./authNavigation";
export default function App() {
  const { ready, user } = useAuth(), location = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => { document.title = `Bruno Sells · ${location.pathname.startsWith("/items/") ? "Item" : location.pathname === "/board" ? "Browse items" : location.pathname === "/mine" ? "My items" : "Campus marketplace"}`; }, [location.pathname]);
  useEffect(() => { const open = () => setShowWelcome(true); window.addEventListener("show-welcome-guide", open); window.addEventListener("open-welcome-guide", open); return () => { window.removeEventListener("show-welcome-guide", open); window.removeEventListener("open-welcome-guide", open); }; }, []);
  if (!ready) return null;
  const protectedPage = page => <ProtectedRoute>{page}</ProtectedRoute>;
  return <div className="app-shell">{location.pathname !== "/" && location.pathname !== "/login" && <NavBar />}<WelcomeModal open={showWelcome} onClose={() => setShowWelcome(false)} /><FirstTimeOnboardingModal open={!!user && location.pathname === "/board" && sessionStorage.getItem("claimco_pending_onboarding") === "1"} /><Routes>
    <Route path="/" element={user ? <Navigate to="/board" replace /> : <LandingPage />} /><Route path="/login" element={user ? <Navigate to={safeNext(new URLSearchParams(location.search).get("next"))} replace /> : <AuthPage />} />
    <Route path="/board" element={<Board />} /><Route path="/post" element={protectedPage(<PostItem />)} /><Route path="/items/:id" element={<ItemDetail />} /><Route path="/mine" element={protectedPage(<MyListings />)} />
    <Route path="/account" element={protectedPage(<Account />)} /><Route path="/users/:id" element={<PublicProfile />} /><Route path="/messages" element={protectedPage(<Messages />)} /><Route path="/chat/:conversationId" element={protectedPage(<Chat />)} /><Route path="/help" element={<Help />} />
    <Route path="*" element={<Navigate to={user ? "/board" : "/"} replace />} />
  </Routes></div>;
}
