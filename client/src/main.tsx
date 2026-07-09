import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "./ThemeContext.tsx";
import { registerSW } from "./push.ts";
import "./index.css";
import "./i18n.ts";

registerSW();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
