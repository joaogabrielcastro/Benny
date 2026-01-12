import axios from "axios";

const api = axios.create({
  baseURL: "https://benny-oh3g.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
