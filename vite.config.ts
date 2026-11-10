import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // WHY: GitHub Pages hosts this project under /LegalTech/, not at the domain root.
  // Local development and preview keep the normal root path.
  base: process.env.GITHUB_ACTIONS === "true" ? "/LegalTech/" : "/",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    clearMocks: true
  }
});
