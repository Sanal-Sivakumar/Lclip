import test from "node:test";
import assert from "node:assert/strict";
import { downloadGiphyAsset, readBodyWithLimit, validateGiphyUrl } from "../src/main/giphy.mjs";

test("GIPHY URLs require HTTPS and an exact GIPHY host boundary", () => {
  assert.equal(validateGiphyUrl("https://media.giphy.com/media/demo/giphy.gif").hostname, "media.giphy.com");
  assert.throws(() => validateGiphyUrl("http://media.giphy.com/demo.gif"), /Unsupported GIF source/);
  assert.throws(() => validateGiphyUrl("https://giphy.com.evil.example/demo.gif"), /Unsupported GIF source/);
});

test("stream reader stops before retaining a body above the byte limit", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3, 4]));
      controller.enqueue(new Uint8Array([5, 6, 7, 8]));
      controller.close();
    }
  });
  await assert.rejects(readBodyWithLimit(new Response(body), 6), /GIF is too large/);
});

test("download rejects oversized declared responses before reading", async () => {
  let bodyRead = false;
  const response = {
    ok: true,
    url: "https://media.giphy.com/demo.gif",
    headers: new Headers({ "content-length": "20", "content-type": "image/gif" }),
    body: { getReader() { bodyRead = true; throw new Error("body should not be read"); } }
  };
  await assert.rejects(downloadGiphyAsset("https://media.giphy.com/demo.gif", {
    fetchImpl: async () => response,
    maxBytes: 10
  }), /GIF is too large/);
  assert.equal(bodyRead, false);
});

test("download revalidates redirects and supports cancellation", async () => {
  const redirected = {
    ok: true,
    url: "https://example.com/not-giphy.gif",
    headers: new Headers({ "content-type": "image/gif" }),
    body: new Response(new Uint8Array([1])).body
  };
  await assert.rejects(downloadGiphyAsset("https://media.giphy.com/demo.gif", {
    fetchImpl: async () => redirected
  }), /Unsupported GIF source/);

  const controller = new AbortController();
  const pending = downloadGiphyAsset("https://media.giphy.com/demo.gif", {
    signal: controller.signal,
    timeoutMilliseconds: 5_000,
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    })
  });
  controller.abort(new Error("cancelled"));
  await assert.rejects(pending, /cancelled/);
});
