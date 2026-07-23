#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

const allowUntagged = process.argv.includes("--allow-untagged");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const smokeChecklist = await readFile(new URL("../docs/linux-smoke-test.md", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const releaseWorkflow = await readFile(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
const releaseAssembly = await readFile(new URL("./prepare-release-assets.sh", import.meta.url), "utf8");
const expectedTag = `v${packageJson.version}`;
const actualTag = process.env.GITHUB_REF_TYPE === "tag"
  ? process.env.GITHUB_REF_NAME
  : process.env.LCLIP_RELEASE_TAG;

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageJson.version)) {
  throw new Error(`package.json contains an invalid release version: ${packageJson.version}`);
}

if (packageLock.version !== packageJson.version || packageLock.packages?.[""]?.version !== packageJson.version) {
  throw new Error("package.json and package-lock.json release versions do not match");
}

const changelogHeading = new RegExp(`^## \\[${packageJson.version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m");
if (!changelogHeading.test(changelog)) {
  throw new Error(`CHANGELOG.md has no dated section for ${packageJson.version}`);
}

if (actualTag && actualTag !== expectedTag) {
  throw new Error(`Release tag ${actualTag} does not match package version ${expectedTag}`);
}

if (!actualTag && !allowUntagged) {
  throw new Error(`No release tag was supplied; expected ${expectedTag}`);
}

const isPrerelease = packageJson.version.includes("-");
const stableContractChecks = [
  [Boolean(packageJson.author?.name && packageJson.author?.email), "Linux package maintainer identity"],
  [packageJson.desktopName === "io.lclip.LClip.desktop", "Electron desktop window identity"],
  [packageJson.build?.linux?.syncDesktopName === true, "synchronized Linux desktop filename"],
  [releaseWorkflow.includes("runner: ubuntu-24.04-arm"), "native ARM64 release runner"],
  [["AppImage", "deb", "rpm", "tar.gz"].every((format) => releaseAssembly.includes(format)), "complete Linux release format set"],
  [releaseWorkflow.includes("smoke-packaged-linux.sh"), "packaged runtime smoke test"],
  [releaseWorkflow.includes("SHA256SUMS"), "release checksums"],
  [releaseWorkflow.includes("prepare-release-assets.sh"), "tested release asset assembly"],
  [releaseWorkflow.includes("uses: actions/attest@v4"), "release provenance attestations"],
  [releaseWorkflow.includes("verify-published:"), "public installer verification job"],
  [releaseWorkflow.includes("./install-lclip.sh --release"), "public no-root install exercise"],
  [packageJson.build?.linux?.target?.includes("tar.gz"), "portable tar.gz build target"],
  [smokeChecklist.includes("Core fallback contract"), "documented desktop fallback contract"],
  [smokeChecklist.includes("CI-enforced"), "documented CI-enforced architecture checks"],
  [readme.includes("/releases/latest/download/LClip-linux-x64.tar.gz"), "x86-64 portable direct download"],
  [readme.includes("/releases/latest/download/LClip-linux-arm64.tar.gz"), "ARM64 portable direct download"],
  [readme.includes("/releases/latest/download/install-lclip.sh"), "no-root installer direct download"]
];
if (!isPrerelease) {
  const missing = stableContractChecks.filter(([valid]) => !valid).map(([, label]) => label);
  if (missing.length) throw new Error(`Stable release contract is incomplete: ${missing.join(", ")}`);
}

console.log(`${expectedTag}: ${isPrerelease ? "prerelease" : "stable"} metadata is internally consistent`);
if (!actualTag) {
  console.log("No tag supplied; validation is running in source-check mode");
}
