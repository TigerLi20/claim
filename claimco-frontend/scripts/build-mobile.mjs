import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, ".env.mobile");
if (!fs.existsSync(file)) {
  console.error("Create .env.mobile from .env.mobile.example and set VITE_MOBILE_API_BASE to the live HTTPS backend URL.");
  process.exit(1);
}
const text = fs.readFileSync(file, "utf8");
const match = text.match(/^VITE_MOBILE_API_BASE=(.+)$/m);
if (!match || !/^https:\/\/(?!your-backend\.example\.com)[^\s/]+/.test(match[1].trim())) {
  console.error("VITE_MOBILE_API_BASE must be the live HTTPS backend URL, with no placeholder.");
  process.exit(1);
}
const result = spawnSync(path.join(root, "node_modules/.bin/vite"), ["build", "--mode", "mobile"], { cwd: root, stdio: "inherit" });
process.exit(result.status ?? 1);
