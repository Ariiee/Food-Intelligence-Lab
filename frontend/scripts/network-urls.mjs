import os from "os";
import { isIPv4 } from "net";

/** Browser-ready URLs for this machine (not 0.0.0.0). */
export function getDevAccessUrls(port = process.env.PORT ?? "3000") {
  const urls = [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ];
  const seen = new Set(urls);

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces ?? []) {
      if (!isIPv4(iface.address) || iface.internal) continue;
      const url = `http://${iface.address}:${port}`;
      if (!seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
  }

  const host = os.hostname();
  if (host) {
    const url = `http://${host}:${port}`;
    if (!seen.has(url)) urls.push(url);
  }

  return urls;
}

/** Hostnames registered in next.config allowedDevOrigins (must match, no http://). */
export function getDevAllowedHosts() {
  const hosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const machine = os.hostname();
  if (machine) hosts.add(machine.toLowerCase());

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces ?? []) {
      if (!isIPv4(iface.address) || iface.internal) continue;
      hosts.add(iface.address);
    }
  }

  return [...hosts];
}
