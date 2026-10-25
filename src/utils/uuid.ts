/**
 * RFC 4122 v4 UUID that works on insecure origins too.
 *
 * `crypto.randomUUID()` is only available in secure contexts (https or
 * localhost) — on a plain-http LAN address like http://192.168.1.42:3152 it is
 * undefined and every call throws. This helper prefers the native
 * implementation, then falls back to getRandomValues (available everywhere),
 * then to Math.random as a last resort.
 */
export function uuid(): string {
  const c: Crypto | undefined = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  // Variant + version bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
