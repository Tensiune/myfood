import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { NotificationProvider } from "./context/NotificationContext";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root no documento.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
);