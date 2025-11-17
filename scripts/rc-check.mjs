#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const pkgPath = path.join(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

function assert(condition, message) {
  if (!condition) {
    console.error(`\n[RC] ${message}`);
    process.exitCode = 1;
  }
}

function run(command) {
  console.log(`\n[RC] run: ${command}`);
  try {
    execSync(command, { stdio: "inherit", env: process.env });
  } catch {
    console.error(`\n[RC] failed: ${command}`);
    process.exitCode = 1;
  }
}

const requiredEnv = [
  "APP_BASE_URL",
  "AIRTABLE_API_KEY",
  "AIRTABLE_BASE_ID",
  "AIRTABLE_ENDPOINT_URL",
  "GEMINI_API_KEY",
  "BLOB_READ_WRITE_TOKEN",
];

const missing = requiredEnv.filter((key) => !process.env[key]);
assert(missing.length === 0, `Missing env vars: ${missing.join(", ") || "none"}`);

const nodeMajor = Number(process.versions.node.split(".")[0]);
assert(nodeMajor >= 18, "Node.js 18+ を使用してください (推奨 20) ");

try {
  const pnpmVersion = execSync("pnpm --version", { encoding: "utf8" }).trim();
  const pnpmMajor = Number(pnpmVersion.split(".")[0]);
  assert(pnpmMajor >= 9, `pnpm 9+ を推奨します (current: ${pnpmVersion})`);
} catch {
  assert(false, "pnpm が必要です");
}

const scripts = pkg.scripts ?? {};
if (scripts.lint) run("pnpm lint");
if (scripts.typecheck) run("pnpm typecheck");
if (scripts.build) run("pnpm build");

if (process.exitCode) {
  console.error("\n[RC] チェックに失敗しました。上記ログを確認してください。");
  process.exit(process.exitCode);
} else {
  console.log("\n[RC] ✅ すべてのチェックが完了しました");
}
