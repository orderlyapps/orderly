import { execSync, spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite-plus";

import viteReact from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const proclaimerCoreDir = fileURLToPath(new URL("../../packages/proclaimer", import.meta.url));

// Rebuild proclaimer-core into dist/ whenever its sources change during `vp dev`,
// so the dev server never serves stale package output.
function proclaimerCoreWatch(): Plugin {
  let child: ChildProcess | undefined;
  return {
    name: "proclaimer-core-watch",
    apply: "serve",
    configureServer(server) {
      child = spawn("vp", ["pack", "--watch"], {
        cwd: proclaimerCoreDir,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      child.on("error", (err) =>
        server.config.logger.warn(`proclaimer-core watch failed: ${err.message}`),
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

function buildId(): string {
  let commit: string | undefined;
  try {
    const branch = execSync("git branch --show-current", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const sha = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    commit = branch ? `${branch}@${sha}` : sha;
  } catch {
    commit = undefined;
  }
  const time = new Date().toISOString().slice(0, 16).replace("T", " ");
  return [process.env.APP_CHANNEL, commit, `${time} UTC`].filter(Boolean).join(" · ");
}

const config = defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [
    proclaimerCoreWatch(),
    viteReact(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Proclaimer",
        short_name: "Proclaimer",
        description: "Proclaimer app",
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
});

export default config;
