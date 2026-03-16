import axios from "axios";

const baseURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api"
    : "https://benny-oh3g.onrender.com/api";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Injeta o JWT Bearer token em todas as requisições autenticadas
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redireciona para /login se o token expirar ou for inválido
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
