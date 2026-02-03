import React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { NotificationProvider } from "./context/NotificationContext";
import { AuthProvider } from "./context/AuthContext";
import { CallProvider } from "./context/CallContext";
import CallOverlay from "./components/shared/CallOverlay"; // Importado globalmente

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <NotificationProvider>
          <CallProvider>
            <CallOverlay /> {/* Renderizado globalmente */}
            <App />
          </CallProvider>
        </NotificationProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}