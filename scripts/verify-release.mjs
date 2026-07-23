#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

const allowUntagged = process.argv.includes("--allow-untagged");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const smokeChecklist = await readFile(new URL("../docs/linux-smoke-test.md", import.meta.url), "utf8");
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
const matrixRows = smokeChecklist.split("\n")
  .filter(line => /^\|.*\|$/.test(line.trim()))
  .map(line => line.split("|").slice(1, -1).map(cell => cell.trim()))
  .filter(cells => cells.length >= 8 && cells[0] !== "Environment" && !cells.every(cell => /^-+$/.test(cell)));
if (!isPrerelease && (matrixRows.length < 4 || matrixRows.some(cells => cells.at(-2) !== "Pass" || !cells.at(-1) || /^Pending$/i.test(cells.at(-1))))) {
  throw new Error("Stable releases require a passing result and evidence for every Linux smoke-test matrix row");
}

console.log(`${expectedTag}: ${isPrerelease ? "prerelease" : "stable"} metadata is internally consistent`);
if (!actualTag) {
  console.log("No tag supplied; validation is running in source-check mode");
}
