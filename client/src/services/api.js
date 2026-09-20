import axios from "axios";
import { readToken, clearSession } from "../utils/session";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Base server origin (no /api suffix) - used to resolve uploaded file paths like /uploads/xxx.jpg
export const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

const api = axios.create({
  baseURL: API_URL,
});

// Attach the saved JWT (if any) to every outgoing request
api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// When the server says the sign-in this browser is holding is no longer good
// (logged out elsewhere, password changed, account banned, expired), go back to
// the login page instead of leaving a dead session on screen. `sessionEnded`
// is only sent for that - a wrong password or a failed check doesn't have it.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response.data?.sessionEnded && readToken()) {
      clearSession();
      window.location.assign("/login?expired=1");
    }
    return Promise.reject(error);
  }
);

export const registerUser = (data) => api.post("/auth/register", data);
export const loginUser = (data) => api.post("/auth/login", data);
export const verifyLoginMfa = (mfaToken, code) => api.post("/auth/login/mfa", { mfaToken, code });
export const resendLoginMfa = (mfaToken) => api.post("/auth/login/mfa/resend", { mfaToken });
// Given the token explicitly: by the time this runs, the browser has already forgotten it.
export const logoutSession = (token) =>
  api.post("/auth/logout", null, { headers: { Authorization: `Bearer ${token}` } });
export const getCurrentUser = () => api.get("/auth/me");
export const setTwoStep = (enabled, password) => api.put("/auth/mfa", { enabled, password });
export const exportMyData = () => api.get("/auth/me/export", { responseType: "blob" });
// A farmer's ID and farm documents are private - fetched with the login token, as a file.
export const getDocumentFile = (path) => api.get(path, { responseType: "blob" });
export const requestLoginOtp = (email) => api.post("/auth/login-otp/request", { email });
export const loginWithOtp = (email, code) => api.post("/auth/login-otp/verify", { email, code });
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });
export const resetPassword = (email, code, password) => api.post("/auth/reset-password", { email, code, password });
export const updateProfile = (data) => api.put("/auth/profile", data);
export const uploadAvatar = (formData) =>
  api.put("/auth/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const changePassword = (currentPassword, newPassword) =>
  api.put("/auth/change-password", { currentPassword, newPassword });
// A farmer fills in a form first, so they send { reason, description?, agreedToTerms };
// a buyer's dialog sends nothing.
export const requestAccountDeletion = (form) => api.post("/auth/delete-account/request-otp", form);
export const confirmAccountDeletion = (code) => api.post("/auth/delete-account/confirm", { code });

export const getMyProducts = () => api.get("/products/mine");
export const getAllProducts = (params) => api.get("/products", { params });
export const getFarmers = (params) => api.get("/farmers", { params });
export const getFarmerProfile = (id) => api.get(`/farmers/${id}`);

// The Province > Municipality/City lists for address pickers
export const getProvinces = () => api.get("/locations/provinces");
export const getCities = (provinceCode) => api.get(`/locations/provinces/${provinceCode}/cities`);
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (formData) =>
  api.post("/products", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const updateProduct = (id, formData) =>
  api.put(`/products/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
export const restockProduct = (id, amount) => api.patch(`/products/${id}/restock`, { amount });
export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const getFarmerOrders = () => api.get("/orders/farmer");
export const getBuyerOrders = () => api.get("/orders/buyer");
export const getOrder = (id) => api.get(`/orders/${id}`);
export const createOrder = (productId, quantity) => api.post("/orders", { productId, quantity });
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}/status`, { status });
// Takes the last status change back, one step (see undoOrderStatus).
export const undoOrderStatus = (id) => api.patch(`/orders/${id}/undo`);
export const cancelOrder = (id) => api.patch(`/orders/${id}/cancel`);
export const archiveOrder = (id, archived) => api.patch(`/orders/${id}/archive`, { archived });

export const submitVerification = (formData) =>
  api.post("/auth/verification", formData, { headers: { "Content-Type": "multipart/form-data" } });

export const getAdminUsers = (role) => api.get("/admin/users", { params: role ? { role } : {} });
export const banUser = (id) => api.patch(`/admin/users/${id}/ban`);
export const unbanUser = (id) => api.patch(`/admin/users/${id}/unban`);
export const reviewFarmerVerification = (id, approved, note) =>
  api.patch(`/admin/users/${id}/verification`, { approved, note });

// Reports: a buyer reports a farmer (multipart, with optional evidence photos);
// admins review each one and make the final call.
export const createReport = (formData) =>
  api.post("/reports", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getAdminReports = () => api.get("/admin/reports");
export const markReportReviewed = (id) => api.patch(`/admin/reports/${id}/review`);
export const decideReport = (id, action, note) => api.patch(`/admin/reports/${id}/decision`, { action, note });

// Blocking: a buyer can block a farmer's shop, which hides it from them and
// stops that farmer selling to them. The list is the buyer's own and is kept
// on the server, so every one of those rules is enforced there too.
export const getBlockedUsers = () => api.get("/blocks");
export const blockUser = (farmerId) => api.post(`/blocks/${farmerId}`);
export const unblockUser = (farmerId) => api.delete(`/blocks/${farmerId}`);

export const requestAdminOtp = (email) => api.post("/admin-auth/request-otp", { email });
export const registerAdmin = (data) => api.post("/admin-auth/register", data);

export const createRating = (orderId, stars, comment) =>
  api.post("/ratings", { orderId, stars, comment });
export const getProductRatings = (productId) => api.get(`/ratings/product/${productId}`);
export const toggleRatingLike = (ratingId) => api.post(`/ratings/${ratingId}/like`);

// Reporting a review: `report` is { ratingId, reason, description? }.
// Admins review each one and decide.
export const createReviewReport = (report) => api.post("/review-reports", report);
export const getAdminReviewReports = () => api.get("/admin/review-reports");
export const markReviewReportReviewed = (id) => api.patch(`/admin/review-reports/${id}/review`);
export const decideReviewReport = (id, action, note) =>
  api.patch(`/admin/review-reports/${id}/decision`, { action, note });

export default api;
