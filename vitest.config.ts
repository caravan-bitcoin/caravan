import { defineConfig } from "vitest/config";
import path from "path";

if (typeof global.self === "undefined") {
  global.self = global as Window & typeof globalThis;
}

const setupFile = path.resolve(
  __dirname,
  "packages/caravan-wallets/vitest.setup.ts"
);
const isCarvanWallet = process.env.PACKAGE === "caravan-wallets";

export default defineConfig({
  define: {
    self: "globalThis",
  },
  test: {
    include: ["./**/*.test.ts"],
    globals: true,
    environment: "node",
    setupFiles: isCarvanWallet ? [setupFile] : [],
  },
});
