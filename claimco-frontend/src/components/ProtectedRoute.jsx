import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authPath } from "../authNavigation";

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to={authPath(location.pathname + location.search + location.hash)} replace />;
  return children;
}
