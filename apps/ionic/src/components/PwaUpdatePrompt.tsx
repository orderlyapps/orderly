import { useEffect, useState } from "react";

import { IonAlert } from "@ionic/react";
import type { ChangelogEntry } from "ionic-core";
import { useRegisterSW } from "virtual:pwa-register/react";

interface VersionInfo {
  version?: string;
  changelog?: ChangelogEntry[];
}

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
const MIN_UPDATE_CHECK_GAP = 60 * 1000;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const PwaUpdatePrompt = () => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [versionInfo, setVersionInfo] = useState<VersionInfo>();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      setRegistration(reg);
    },
  });

  // Look for updates while the app is in use: hourly, and whenever it returns
  // to the foreground (throttled). A waiting service worker fires onNeedRefresh.
  useEffect(() => {
    if (!registration) return;
    let lastCheck = Date.now();
    const check = () => {
      const now = Date.now();
      if (document.visibilityState !== "visible" || now - lastCheck < MIN_UPDATE_CHECK_GAP) {
        return;
      }
      lastCheck = now;
      registration.update().catch(() => {});
    };
    const interval = setInterval(check, UPDATE_CHECK_INTERVAL);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, [registration]);

  useEffect(() => {
    if (!needRefresh) return;
    // version.json is emitted at build time and excluded from the precache, so
    // this returns the incoming version's changelog. If it is unavailable
    // (e.g. offline or an old deployment), the alert falls back to a generic
    // message — the bundled changelog describes the version already installed.
    fetch(`${import.meta.env.BASE_URL}version.json`, { cache: "no-cache" })
      .then((res) => (res.ok ? (res.json() as Promise<VersionInfo>) : undefined))
      .then(setVersionInfo)
      .catch(() => setVersionInfo(undefined));
  }, [needRefresh]);

  const parts: string[] = [];
  if (versionInfo?.version) {
    parts.push(`<p><strong>Version ${escapeHtml(versionInfo.version)}</strong></p>`);
  }
  const entry = versionInfo?.changelog?.[0];
  if (entry?.changes.length) {
    parts.push(
      `<ul style="margin:0;padding-left:1.2em;text-align:start">${entry.changes
        .map((change) => `<li>${escapeHtml(change)}</li>`)
        .join("")}</ul>`,
    );
  }
  const message = parts.join("") || "A new version of the app is ready.";

  return (
    <IonAlert
      isOpen={needRefresh}
      header="Update available"
      message={message}
      buttons={[
        { text: "Later", role: "cancel" },
        {
          text: "Update now",
          handler: () => {
            void updateServiceWorker(true);
          },
        },
      ]}
      onDidDismiss={() => setNeedRefresh(false)}
    />
  );
};
