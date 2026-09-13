import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App";
import { registerPWA } from "./services/pwa";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

void registerPWA();
