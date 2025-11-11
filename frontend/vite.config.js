// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    https: false,
    // 👇 Needed so React Router routes like /admin/dashboard don’t refresh page
    historyApiFallback: true,
  },
});
