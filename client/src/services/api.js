import axios from "axios";
import { readToken } from "../utils/session";

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

export const registerUser = (data) => api.post("/auth/register", data);
export const loginUser = (data) => api.post("/auth/login", data);
export const getCurrentUser = () => api.get("/auth/me");
export const requestLoginOtp = (email) => api.post("/auth/login-otp/request", { email });
export const loginWithOtp = (email, code) => api.post("/auth/login-otp/verify", { email, code });
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });
export const resetPassword = (email, code, password) => api.post("/auth/reset-password", { email, code, password });
export const updateProfile = (data) => api.put("/auth/profile", data);
export const uploadAvatar = (formData) =>
  api.put("/auth/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const changePassword = (currentPassword, newPassword) =>
  api.put("/auth/change-password", { currentPassword, newPassword });
export const requestAccountDeletion = () => api.post("/auth/delete-account/request-otp");
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
export const cancelOrder = (id) => api.patch(`/orders/${id}/cancel`);
export const archiveOrder = (id, archived) => api.patch(`/orders/${id}/archive`, { archived });

export const submitVerification = (formData) =>
  api.post("/auth/verification", formData, { headers: { "Content-Type": "multipart/form-data" } });

export const getAdminUsers = (role) => api.get("/admin/users", { params: role ? { role } : {} });
export const banUser = (id) => api.patch(`/admin/users/${id}/ban`);
export const unbanUser = (id) => api.patch(`/admin/users/${id}/unban`);
export const reviewFarmerVerification = (id, approved, note) =>
  api.patch(`/admin/users/${id}/verification`, { approved, note });

export const requestAdminOtp = (email) => api.post("/admin-auth/request-otp", { email });
export const registerAdmin = (data) => api.post("/admin-auth/register", data);

export const createRating = (orderId, stars, comment) =>
  api.post("/ratings", { orderId, stars, comment });
export const getProductRatings = (productId) => api.get(`/ratings/product/${productId}`);
export const toggleRatingLike = (ratingId) => api.post(`/ratings/${ratingId}/like`);

export default api;
