import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getDevAccessUrls, getDevAllowedHosts } from "./network-urls.mjs";

const port = process.env.PORT ?? "3000";
const urls = getDevAccessUrls(port);
const hosts = getDevAllowedHosts();
const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = join(frontendRoot, "node_modules", "next", "dist", "bin", "next");

console.log("");
console.log("  ===============================================================");
console.log("  NEURAL_LAB frontend — open one of these in your browser:");
console.log("  ===============================================================");
for (const url of urls) {
  console.log(`    → ${url}`);
}
console.log("");
console.log("  Share the http://192.168.x.x URL with phones/tablets on your Wi‑Fi.");
console.log("  Do NOT use http://0.0.0.0:3000 — browsers cannot open that address.");
console.log("  (Next may still print Network: 0.0.0.0 — ignore it; use the URLs above.)");
console.log(`  Allowed dev hosts: ${hosts.join(", ")}`);
console.log("  ===============================================================");
console.log("");

const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", "0.0.0.0", "-p", port],
  { cwd: frontendRoot, stdio: "inherit", env: process.env }
);

child.on("exit", (code) => process.exit(code ?? 0));
