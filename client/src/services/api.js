import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Base server origin (no /api suffix) - used to resolve uploaded file paths like /uploads/xxx.jpg
export const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

const api = axios.create({
  baseURL: API_URL,
});

// Attach the saved JWT (if any) to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("anisave_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const registerUser = (data) => api.post("/auth/register", data);
export const loginUser = (data) => api.post("/auth/login", data);
export const getCurrentUser = () => api.get("/auth/me");
export const forgotPassword = (email) => api.post("/auth/forgot-password", { email });
export const resetPassword = (email, code, password) => api.post("/auth/reset-password", { email, code, password });
export const updateProfile = (data) => api.put("/auth/profile", data);
export const changePassword = (currentPassword, newPassword) =>
  api.put("/auth/change-password", { currentPassword, newPassword });
export const requestAccountDeletion = () => api.post("/auth/delete-account/request-otp");
export const confirmAccountDeletion = (code) => api.post("/auth/delete-account/confirm", { code });

export const getMyProducts = () => api.get("/products/mine");
export const getAllProducts = (params) => api.get("/products", { params });
export const getFarmerProfile = (id) => api.get(`/farmers/${id}`);
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (formData) =>
  api.post("/products", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const updateProduct = (id, formData) =>
  api.put(`/products/${id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
export const restockProduct = (id, amount) => api.patch(`/products/${id}/restock`, { amount });
export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const getFarmerOrders = () => api.get("/orders/farmer");
export const getBuyerOrders = () => api.get("/orders/buyer");
export const createOrder = (productId, quantity) => api.post("/orders", { productId, quantity });
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}/status`, { status });

export const getAdminUsers = (role) => api.get("/admin/users", { params: role ? { role } : {} });
export const banUser = (id) => api.patch(`/admin/users/${id}/ban`);
export const unbanUser = (id) => api.patch(`/admin/users/${id}/unban`);

export const requestAdminOtp = (email) => api.post("/admin-auth/request-otp", { email });
export const registerAdmin = (data) => api.post("/admin-auth/register", data);

export default api;
