import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiRequestError,
  assertTrustedJsonRequest,
} from "./api-security";

const request = (headers: Record<string, string> = {}) =>
  new Request("https://example.com/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: "{}",
  });

test("accepts same-origin JSON requests", () => {
  assert.doesNotThrow(() =>
    assertTrustedJsonRequest(
      request({
        Origin: "https://example.com",
        "Sec-Fetch-Site": "same-origin",
      }),
    ),
  );
});

test("rejects unsupported content types", () => {
  assert.throws(
    () =>
      assertTrustedJsonRequest(
        request({ "Content-Type": "text/plain" }),
      ),
    (error: unknown) =>
      error instanceof ApiRequestError && error.statusCode === 415,
  );
});

test("rejects oversized bodies before parsing JSON", () => {
  assert.throws(
    () =>
      assertTrustedJsonRequest(
        request({ "Content-Length": String(17 * 1024) }),
      ),
    (error: unknown) =>
      error instanceof ApiRequestError && error.statusCode === 413,
  );
});

test("rejects cross-origin browser requests", () => {
  assert.throws(
    () =>
      assertTrustedJsonRequest(
        request({
          Origin: "https://attacker.example",
          "Sec-Fetch-Site": "cross-site",
        }),
      ),
    (error: unknown) =>
      error instanceof ApiRequestError && error.statusCode === 403,
  );
});
