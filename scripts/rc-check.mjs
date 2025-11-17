#!/usr/bin/env node
import { execSync, spawnSync } from "node:child_process";

const MIN_NODE_MAJOR = 18;
const MIN_PNPM_MAJOR = 8;

function checkVersions() {
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (nodeMajor < MIN_NODE_MAJOR) {
    throw new Error(`Node.js ${MIN_NODE_MAJOR}+ が必要です (現在 ${process.versions.node})`);
  }

  const pnpmVersion = execSync("pnpm -v").toString().trim();
  const pnpmMajor = Number.parseInt(pnpmVersion.split(".")[0] ?? "0", 10);
  if (pnpmMajor < MIN_PNPM_MAJOR) {
    throw new Error(`pnpm ${MIN_PNPM_MAJOR}+ が必要です (現在 ${pnpmVersion})`);
  }
  console.log(`✔ Node ${process.versions.node}, pnpm ${pnpmVersion}`);
}

function checkEnv() {
  const required = ["APP_BASE_URL", "AIRTABLE_API_KEY", "AIRTABLE_BASE_ID", "GEMINI_API_KEY", "BLOB_READ_WRITE_TOKEN"];
  const missing = required.filter((key) => !process.env[key] || String(process.env[key]).length === 0);
  if (missing.length > 0) {
    throw new Error(`必須の環境変数が不足しています: ${missing.join(", ")}`);
  }
  console.log("✔ 必須環境変数 OK");
}

function run(cmd) {
  console.log(`> ${cmd}`);
  const [bin, ...args] = cmd.split(" ");
  const result = spawnSync(bin, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    throw new Error(`${cmd} が失敗しました`);
  }
}

async function main() {
  try {
    checkVersions();
    checkEnv();
    run("pnpm lint");
    if (hasScript("typecheck")) {
      run("pnpm typecheck");
    }
    run("pnpm build");
    console.log("✅ rc チェック完了");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function hasScript(name) {
  try {
    const pkgJson = JSON.parse(execSync("cat package.json").toString());
    return Boolean(pkgJson.scripts?.[name]);
  } catch {
    return false;
  }
}

void main();
