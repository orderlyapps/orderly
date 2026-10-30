import { execSync, spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
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

const buildStamp = buildId();

// Emit version.json so the running app can show the incoming version's
// changelog in the update prompt. The .json extension keeps it out of the
// service worker's precache, so it is always fetched from the network.
function versionJson(): Plugin {
  const changelogPath = fileURLToPath(
    new URL("../../packages/ionic/src/feature/about/changelog.json", import.meta.url),
  );
  return {
    name: "version-json",
    apply: "build",
    generateBundle() {
      const changelog = JSON.parse(readFileSync(changelogPath, "utf8")) as { version: string }[];
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: changelog[0]?.version, buildId: buildStamp, changelog }),
      });
    },
  };
}

const config = defineConfig(({ command }) => ({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildStamp),
  },
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
    versionJson(),
    VitePWA({
      registerType: "prompt",
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
