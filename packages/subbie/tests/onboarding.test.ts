import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import {
  createOnboardingPatch,
  isOnboardingComplete,
  OnboardingGate,
  OnboardingView,
} from "../src/feature/onboarding/index.ts";
import {
  ABN_MAX_LENGTH,
  BUSINESS_NAME_MAX_LENGTH,
  createSettingsStore,
  DEFAULT_SETTINGS,
} from "../src/feature/settings/index.ts";

let storeCounter = 0;
function nextStoreName() {
  storeCounter += 1;
  return `subbie_test_${Date.now()}_${storeCounter}`;
}

test("detects onboarding completion and builds settings patches", () => {
  expect(isOnboardingComplete(DEFAULT_SETTINGS)).toBe(false);
  expect(isOnboardingComplete({ ...DEFAULT_SETTINGS, businessName: "   " })).toBe(false);
  expect(isOnboardingComplete({ ...DEFAULT_SETTINGS, businessName: "Acme Pty Ltd" })).toBe(true);

  expect(createOnboardingPatch({ businessName: "Acme Pty Ltd" })).toEqual({
    businessName: "Acme Pty Ltd",
    abn: "",
  });
  expect(
    createOnboardingPatch({
      businessName: "  Acme Pty Ltd  ",
      abn: " 51 824 753 556 ",
      gstRegistered: false,
    }),
  ).toEqual({
    businessName: "Acme Pty Ltd",
    abn: "51 824 753 556",
    gstRegistered: false,
  });
  expect(createOnboardingPatch({ businessName: "Acme Pty Ltd", gstRegistered: null })).toEqual({
    businessName: "Acme Pty Ltd",
    abn: "",
  });

  expect(createOnboardingPatch({ businessName: "" })).toBeNull();
  expect(createOnboardingPatch({ businessName: "   " })).toBeNull();
  expect(
    createOnboardingPatch({ businessName: "a".repeat(BUSINESS_NAME_MAX_LENGTH + 1) }),
  ).toBeNull();
  expect(
    createOnboardingPatch({
      businessName: "Acme Pty Ltd",
      abn: "a".repeat(ABN_MAX_LENGTH + 1),
    }),
  ).toBeNull();
});

test("gate renders onboarding until a business name is saved", async () => {
  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    const onboarding = createElement("p", null, "onboarding");
    const app = createElement("p", null, "app");

    const render = () =>
      renderToStaticMarkup(createElement(OnboardingGate, { store, onboarding }, app));

    expect(render()).toBe("<p>onboarding</p>");

    const patch = createOnboardingPatch({
      businessName: "Acme Pty Ltd",
      abn: "51 824 753 556",
      gstRegistered: false,
    });
    expect(patch).not.toBeNull();
    if (!patch) {
      throw new Error("Expected onboarding patch to be valid");
    }
    const updated = await store.updateSettings(patch);
    expect(isOnboardingComplete(updated)).toBe(true);
    expect(updated.businessName).toBe("Acme Pty Ltd");
    expect(updated.abn).toBe("51 824 753 556");
    expect(updated.gstRegistered).toBe(false);

    expect(render()).toBe("<p>app</p>");
  } finally {
    await store.close();
  }
});

test("renders the onboarding form with a disabled continue button", async () => {
  const store = await createSettingsStore({ name: nextStoreName() });
  try {
    const markup = renderToStaticMarkup(createElement(OnboardingView, { store }));
    expect(markup).toContain("Welcome to Subbie");
    expect(markup).toContain("Business details");
    expect(markup).toContain("<ion-input");
    expect(markup).toContain("<ion-select");
    expect(markup).toContain("ion-button");
    expect(markup).toContain("disabled");
  } finally {
    await store.close();
  }
});
