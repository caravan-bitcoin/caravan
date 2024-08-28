import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["./**/*.test.ts", "./**/*.test.tsx"],
    global: true,
    environment: "jsdom",
  },
});
