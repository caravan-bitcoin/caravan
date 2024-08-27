import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // some paths to the files that are test files
    include: ["./**/*.test.ts", "./**/*.test.tsx"],
    global: true,
    environment: "jsdom",
  },
});
