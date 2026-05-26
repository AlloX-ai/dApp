import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// @metamask/connect-multichain imports mobile-wallet-protocol-core as a namespace
// (mwpCore.SessionStore). Vite resolves the package "main" (CJS index.js), which
// breaks named exports; the ESM build (index.mjs) exports SessionStore correctly.
const mwpCoreEsm = path.resolve(
  rootDir,
  "node_modules/@metamask/mobile-wallet-protocol-core/dist/index.mjs",
);

const eciesjsEsm = path.resolve(rootDir, "src/shims/eciesjs.mjs");

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: [
      { find: "@metamask/mobile-wallet-protocol-core", replacement: mwpCoreEsm },
      // Exact package id only — avoid rewriting eciesjs/dist/... used by the shim.
      { find: /^eciesjs$/, replacement: eciesjsEsm },
    ],
    dedupe: ["@reown/appkit", "@reown/appkit-controllers", "valtio"],
  },
  optimizeDeps: {
    include: [
      "@metamask/connect-evm",
      "@metamask/connect-multichain",
      "@metamask/mobile-wallet-protocol-core",
      "@metamask/mobile-wallet-protocol-dapp-client",
      "eciesjs",
    ],
    needsInterop: ["eciesjs"],
  },
});
