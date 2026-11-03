import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import type { BackendSupabaseClient } from "../src/feature/backend/index.ts";
import {
  PUBLISHER_AUTH_EMAIL_DOMAIN,
  PublisherSignIn,
  publisherAuthEmail,
  sendPublisherOtp,
  signInPublisherWithPassword,
  verifyPublisherOtp,
} from "../src/feature/auth/index.ts";

function stubClient(auth: Record<string, unknown>): BackendSupabaseClient {
  return { auth } as unknown as BackendSupabaseClient;
}

test("builds the synthetic publisher auth email from the publisher id", () => {
  expect(publisherAuthEmail("publisher-1")).toBe(`publisher-1@${PUBLISHER_AUTH_EMAIL_DOMAIN}`);
  expect(publisherAuthEmail("  publisher-2  ")).toBe(`publisher-2@${PUBLISHER_AUTH_EMAIL_DOMAIN}`);
});

test("renders otp and password inputs together", () => {
  const markup = renderToStaticMarkup(
    createElement(PublisherSignIn, {
      publisherId: "p1",
      client: stubClient({}),
    }),
  );
  expect(markup).toContain("<ion-input-otp");
  expect(markup).toContain("<ion-input>");
  expect(markup).toContain("Resend code");
  expect(markup).toContain(`p1@${PUBLISHER_AUTH_EMAIL_DOMAIN}`);
  expect(markup).not.toContain("Email me a sign-in code");
  expect(markup).not.toContain("You are signed in");
});

test("sendPublisherOtp requests a code without creating a user", async () => {
  const calls: unknown[] = [];
  const client = stubClient({
    signInWithOtp: async (args: unknown) => {
      calls.push(args);
      return { error: null };
    },
  });
  const result = await sendPublisherOtp(client, "p1@proclaimer.app");
  expect(result).toEqual({ session: null, error: null });
  expect(calls).toEqual([{ email: "p1@proclaimer.app", options: { shouldCreateUser: false } }]);
});

test("sendPublisherOtp maps returned and thrown errors to a message", async () => {
  const returned = await sendPublisherOtp(
    stubClient({ signInWithOtp: async () => ({ error: { message: "rate limited" } }) }),
    "p1@proclaimer.app",
  );
  expect(returned).toEqual({ session: null, error: "rate limited" });

  const thrown = await sendPublisherOtp(
    stubClient({
      signInWithOtp: async () => {
        throw new Error("network down");
      },
    }),
    "p1@proclaimer.app",
  );
  expect(thrown).toEqual({ session: null, error: "network down" });
});

test("verifyPublisherOtp returns the session on success and the error on failure", async () => {
  const session = { user: { email: "p1@proclaimer.app" } };
  const success = await verifyPublisherOtp(
    stubClient({ verifyOtp: async () => ({ data: { session }, error: null }) }),
    "p1@proclaimer.app",
    "123456",
  );
  expect(success).toEqual({ session, error: null });

  const failure = await verifyPublisherOtp(
    stubClient({ verifyOtp: async () => ({ data: {}, error: { message: "expired" } }) }),
    "p1@proclaimer.app",
    "123456",
  );
  expect(failure).toEqual({ session: null, error: "expired" });

  const thrown = await verifyPublisherOtp(
    stubClient({
      verifyOtp: async () => {
        throw new Error("offline");
      },
    }),
    "p1@proclaimer.app",
    "123456",
  );
  expect(thrown).toEqual({ session: null, error: "offline" });
});

test("signInPublisherWithPassword returns the session on success", async () => {
  const calls: unknown[] = [];
  const session = { user: { email: "p1@proclaimer.app" } };
  const client = stubClient({
    signInWithPassword: async (args: unknown) => {
      calls.push(args);
      return { data: { session }, error: null };
    },
  });
  const result = await signInPublisherWithPassword(client, "p1@proclaimer.app", "s3cret");
  expect(result).toEqual({ session, error: null });
  expect(calls).toEqual([{ email: "p1@proclaimer.app", password: "s3cret" }]);

  const failure = await signInPublisherWithPassword(
    stubClient({
      signInWithPassword: async () => ({
        data: {},
        error: { message: "Invalid login credentials" },
      }),
    }),
    "p1@proclaimer.app",
    "wrong",
  );
  expect(failure).toEqual({ session: null, error: "Invalid login credentials" });
});
