import axios from "axios";

const defaultApiUrl = import.meta.env.PROD
  ? "https://api-benny.jwsoftware.com.br/api"
  : "/api";

const rawApiUrl = import.meta.env.VITE_API_URL || defaultApiUrl;
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, "");
const baseURL = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Híbrido: Bearer (localStorage) + cookie httpOnly (withCredentials)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname || "";
      const onLogin = path === "/login" || path.startsWith("/login");
      if (!onLogin) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
