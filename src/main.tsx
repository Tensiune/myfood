import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { NotificationProvider } from "./context/NotificationContext";

createRoot(document.getElementById("root")!).render(
  <NotificationProvider>
    <App />
  </NotificationProvider>
);