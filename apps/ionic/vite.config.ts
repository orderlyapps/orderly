import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite-plus";

import viteReact from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const ionicCoreDir = fileURLToPath(new URL("../../packages/ionic", import.meta.url));

// Rebuild ionic-core into dist/ whenever its sources change during `vp dev`,
// so the dev server never serves stale package output.
function ionicCoreWatch(): Plugin {
  let child: ChildProcess | undefined;
  return {
    name: "ionic-core-watch",
    apply: "serve",
    configureServer(server) {
      child = spawn("vp", ["pack", "--watch"], {
        cwd: ionicCoreDir,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      child.on("error", (err) =>
        server.config.logger.warn(`ionic-core watch failed: ${err.message}`),
      );
      const stop = () => {
        child?.kill();
        process.off("exit", stop);
      };
      server.httpServer?.once("close", stop);
      process.once("exit", stop);
    },
  };
}

const config = defineConfig(({ command }) => ({
  resolve:
    command === "serve"
      ? {
          alias: {
            games: fileURLToPath(new URL("../../packages/games/src/index.ts", import.meta.url)),
          },
        }
      : undefined,
  plugins: [
    ionicCoreWatch(),
    viteReact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Ionic",
        short_name: "Ionic",
        description: "Ionic React app",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
}));

export default config;
