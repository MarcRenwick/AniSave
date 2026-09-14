import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    const home =
      user.role === "farmer"
        ? "/farmer/dashboard"
        : user.role === "buyer"
          ? "/buyer/home"
          : user.role === "admin"
            ? "/admin/users"
            : "/dashboard";
    return <Navigate to={home} replace />;
  }

  return children;
}
