import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import { queryClient } from "./lib/queryClient.js";
import "./index.css";
import "./styles/print.css";

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
