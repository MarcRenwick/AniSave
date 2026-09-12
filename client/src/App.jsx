import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import FarmerProducts from "./pages/farmer/FarmerProducts";
import FarmerOrders from "./pages/farmer/FarmerOrders";
import FarmerNotifications from "./pages/farmer/FarmerNotifications";
import FarmerSettings from "./pages/farmer/FarmerSettings";
import BuyerMarketplace from "./pages/buyer/BuyerMarketplace";
import FarmerProfile from "./pages/buyer/FarmerProfile";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/dashboard"
            element={
              <ProtectedRoute role="farmer">
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/products"
            element={
              <ProtectedRoute role="farmer">
                <FarmerProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/orders"
            element={
              <ProtectedRoute role="farmer">
                <FarmerOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/notifications"
            element={
              <ProtectedRoute role="farmer">
                <FarmerNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer/settings"
            element={
              <ProtectedRoute role="farmer">
                <FarmerSettings />
              </ProtectedRoute>
            }
          />

          {/* Public - browsing the marketplace doesn't require an account */}
          <Route path="/buyer/marketplace" element={<BuyerMarketplace />} />
          <Route path="/buyer/farmers/:id" element={<FarmerProfile />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
