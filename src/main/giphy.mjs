import { Buffer } from "node:buffer";

export const MAX_GIF_BYTES = 15_000_000;
export const MAX_GIPHY_SEARCH_BYTES = 2_000_000;

export function validateGiphyUrl(value) {
  const url = new URL(String(value || ""));
  const allowedHost = url.hostname === "giphy.com" || url.hostname.endsWith(".giphy.com");
  if (url.protocol !== "https:" || !allowedHost) throw new Error("Unsupported GIF source");
  return url;
}

export async function readBodyWithLimit(response, maxBytes = MAX_GIF_BYTES) {
  const reader = response.body?.getReader?.();
  if (!reader) throw new Error("GIF response could not be streamed safely");
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maxBytes) {
        await reader.cancel("GIF exceeds the download limit").catch(() => {});
        throw new Error("GIF is too large");
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock?.();
  }
  return Buffer.concat(chunks, total);
}

export function normalizeGiphyResults(data) {
  return (Array.isArray(data?.data) ? data.data : []).slice(0, 24).map(item => {
    try {
      const preview = validateGiphyUrl(item?.images?.fixed_width_small?.webp || item?.images?.fixed_width?.webp).toString();
      const original = validateGiphyUrl(item?.images?.original?.url).toString();
      return {
        id: String(item?.id || "").slice(0, 120),
        title: String(item?.title || "GIF").slice(0, 120),
        preview,
        original,
        width: Number(item?.images?.fixed_width_small?.width || 200),
        height: Number(item?.images?.fixed_width_small?.height || 120)
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export async function readGiphySearchResponse(response, maxBytes = MAX_GIPHY_SEARCH_BYTES) {
  if (!response.ok) throw new Error("GIPHY search failed");
  validateGiphyUrl(response.url);
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel?.("GIPHY response exceeds the download limit").catch(() => {});
    throw new Error("GIPHY search response is too large");
  }
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.includes("application/json")) throw new Error("GIPHY search returned an unsupported response");
  const bytes = await readBodyWithLimit(response, maxBytes);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("GIPHY search returned invalid data");
  }
}

export async function downloadGiphyAsset(requested, {
  fetchImpl = globalThis.fetch,
  signal,
  timeoutMilliseconds = 12_000,
  maxBytes = MAX_GIF_BYTES
} = {}) {
  const requestedUrl = validateGiphyUrl(requested);
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromParent();
  else signal?.addEventListener("abort", abortFromParent, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error("GIF download timed out")), timeoutMilliseconds);

  try {
    const response = await fetchImpl(requestedUrl, { signal: controller.signal, redirect: "follow" });
    if (!response.ok) throw new Error("GIF download failed");
    const finalUrl = validateGiphyUrl(response.url || requestedUrl);
    const declared = Number(response.headers.get("content-length") || 0);
    if (Number.isFinite(declared) && declared > maxBytes) {
      await response.body?.cancel?.("GIF exceeds the download limit").catch(() => {});
      throw new Error("GIF is too large");
    }
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.startsWith("image/")) throw new Error("GIF source did not return an image");
    const bytes = await readBodyWithLimit(response, maxBytes);
    return { bytes, contentType, url: finalUrl.toString() };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromParent);
  }
}
