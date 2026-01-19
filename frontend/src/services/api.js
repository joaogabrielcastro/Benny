import axios from "axios";

const baseURL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001/api"
    : "https://benny-oh3g.onrender.com/api";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
