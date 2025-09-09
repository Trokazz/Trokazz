import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { registerServiceWorker } from "./utils/pushNotifications.ts"; // Importar a função de registro

// Registrar o Service Worker assim que o aplicativo for carregado
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);