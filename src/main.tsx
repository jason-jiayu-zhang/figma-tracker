import "./posthog";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import App from "./App";
import { SessionProvider } from "./session";
import { API_BASE } from "./config";
import "./index.css";

// Always send the ft_session cookie with API calls; use the configured API base
// (cross-origin app subdomain) when present, otherwise same-origin.
axios.defaults.withCredentials = true;
if (API_BASE) axios.defaults.baseURL = API_BASE;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
