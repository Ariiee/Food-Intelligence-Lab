import os from "os";
import { isIPv4 } from "net";

/** Normalize config entry to a hostname (Next.js compares hostnames, not full URLs). */
function normalizeAllowedHost(entry: string): string | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).hostname.toLowerCase();
    }
  } catch {
    // fall through
  }

  // host:port without protocol
  const withoutPort = trimmed.replace(/:\d+$/, "");
  return withoutPort.toLowerCase();
}

/**
 * Hostnames allowed to load Next.js dev assets (/_next/*) from LAN browsers.
 * Must be hostnames only — NOT "http://192.168.1.3:3000" (those never match).
 */
export function getAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(["localhost", "127.0.0.1", "[::1]"]);

  const machineName = os.hostname();
  if (machineName) {
    hosts.add(machineName.toLowerCase());
  }

  for (const interfaces of Object.values(os.networkInterfaces())) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (!isIPv4(iface.address) || iface.internal) continue;
      hosts.add(iface.address);
    }
  }

  const extra = process.env.ALLOWED_DEV_ORIGINS;
  if (extra) {
    for (const entry of extra.split(",")) {
      const host = normalizeAllowedHost(entry);
      if (host) hosts.add(host);
    }
  }

  return [...hosts];
}
