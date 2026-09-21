import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import FarmerProducts from "./pages/farmer/FarmerProducts";
import FarmerProductForm from "./pages/farmer/FarmerProductForm";
import FarmerProductDetail from "./pages/farmer/FarmerProductDetail";
import FarmerOrders from "./pages/farmer/FarmerOrders";
import FarmerOrderDetail from "./pages/farmer/FarmerOrderDetail";
import FarmerNotifications from "./pages/farmer/FarmerNotifications";
import FarmerSettings from "./pages/farmer/FarmerSettings";
import FarmerDeleteAccount from "./pages/farmer/DeleteAccount";
import BuyerHome from "./pages/buyer/BuyerHome";
import FarmerProfile from "./pages/buyer/FarmerProfile";
import ProductDetail from "./pages/buyer/ProductDetail";
import ProductRatings from "./pages/ProductRatings";
import CartPage from "./pages/buyer/CartPage";
import Checkout from "./pages/buyer/Checkout";
import BuyerSettings from "./pages/buyer/BuyerSettings";
import BuyerOrders from "./pages/buyer/BuyerOrders";
import OrderDetail from "./pages/buyer/OrderDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import ReportFarmer from "./pages/buyer/ReportFarmer";
import ReportReview from "./pages/ReportReview";
import AdminReviewReports from "./pages/admin/AdminReviewReports";
import AdminMarketPrices from "./pages/admin/AdminMarketPrices";
import AdminRegister from "./pages/AdminRegister";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/admin/register" element={<AdminRegister />} />
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
              path="/farmer/products/new"
              element={
                <ProtectedRoute role="farmer">
                  <FarmerProductForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/products/:id"
              element={
                <ProtectedRoute role="farmer">
                  <FarmerProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/products/:id/edit"
              element={
                <ProtectedRoute role="farmer">
                  <FarmerProductForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/products/:id/ratings"
              element={
                <ProtectedRoute role="farmer">
                  <ProductRatings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/products/:id/ratings/:ratingId/report"
              element={
                <ProtectedRoute role="farmer">
                  <ReportReview />
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
              path="/farmer/orders/:id"
              element={
                <ProtectedRoute role="farmer">
                  <FarmerOrderDetail />
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
            <Route
              path="/farmer/delete-account"
              element={
                <ProtectedRoute role="farmer">
                  <FarmerDeleteAccount />
                </ProtectedRoute>
              }
            />

            {/* Public - browsing doesn't require an account */}
            <Route path="/buyer/home" element={<BuyerHome />} />
            <Route path="/buyer/farmers/:id" element={<FarmerProfile />} />
            <Route
              path="/buyer/farmers/:id/report"
              element={
                <ProtectedRoute role="buyer">
                  <ReportFarmer />
                </ProtectedRoute>
              }
            />
            <Route path="/buyer/products/:id" element={<ProductDetail />} />
            <Route path="/buyer/products/:id/ratings" element={<ProductRatings />} />
            <Route
              path="/buyer/products/:id/ratings/:ratingId/report"
              element={
                <ProtectedRoute role="buyer">
                  <ReportReview />
                </ProtectedRoute>
              }
            />
            <Route path="/buyer/cart" element={<CartPage />} />
            <Route
              path="/buyer/checkout"
              element={
                <ProtectedRoute role="buyer">
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyer/settings"
              element={
                <ProtectedRoute role="buyer">
                  <BuyerSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyer/orders"
              element={
                <ProtectedRoute role="buyer">
                  <BuyerOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buyer/orders/:id"
              element={
                <ProtectedRoute role="buyer">
                  <OrderDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute role="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute role="admin">
                  <AdminReports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/review-reports"
              element={
                <ProtectedRoute role="admin">
                  <AdminReviewReports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/market-prices"
              element={
                <ProtectedRoute role="admin">
                  <AdminMarketPrices />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
