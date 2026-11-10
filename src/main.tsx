import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthGate } from "./lib/supabase/AuthGate";
import "./app/App.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Не найден корневой элемент приложения с id="root".');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>
);
