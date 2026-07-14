import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

if (import.meta.env.PROD) {
  setBaseUrl((import.meta.env.VITE_API_URL as string) || "https://cosmic-coach-backend.onrender.com");
}

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
