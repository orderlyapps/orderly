import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import { AboutView, APP_VERSION, CHANGELOG } from "../src/feature/about/index.ts";
import { AboutSettingsSection } from "../src/feature/settings/index.ts";

const SEMVER = /^\d+\.\d+\.\d+$/;

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return (pa[i] ?? 0) - (pb[i] ?? 0);
    }
  }
  return 0;
}

test("APP_VERSION matches the newest changelog entry", () => {
  expect(APP_VERSION).toBe(CHANGELOG[0]?.version);
});

test("changelog entries are semantic versions sorted newest-first", () => {
  expect(CHANGELOG.length).toBeGreaterThan(0);
  for (const entry of CHANGELOG) {
    expect(entry.version).toMatch(SEMVER);
    expect(entry.changes.length).toBeGreaterThan(0);
  }
  for (let i = 0; i < CHANGELOG.length - 1; i++) {
    const current = CHANGELOG[i];
    const next = CHANGELOG[i + 1];
    expect(compareSemver(current?.version ?? "", next?.version ?? "")).toBeGreaterThan(0);
  }
});

test("AboutView renders the version and every changelog entry", () => {
  const markup = renderToStaticMarkup(createElement(AboutView));
  expect(markup).toContain(APP_VERSION);
  for (const entry of CHANGELOG) {
    expect(markup).toContain(entry.version);
    expect(markup).toContain(entry.date);
    for (const change of entry.changes) {
      const escaped = change
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#x27;");
      expect(markup).toContain(escaped);
    }
  }
});

test("AboutView honours an explicit version", () => {
  const markup = renderToStaticMarkup(createElement(AboutView, { version: "9.9.9" }));
  expect(markup).toContain("9.9.9");
});

test("AboutSettingsSection links to the about page and shows the version", () => {
  const markup = renderToStaticMarkup(createElement(AboutSettingsSection));
  expect(markup).toContain("/settings/about");
  expect(markup).toContain(APP_VERSION);
});
