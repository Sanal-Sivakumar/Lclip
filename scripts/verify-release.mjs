#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

const allowUntagged = process.argv.includes("--allow-untagged");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const smokeChecklist = await readFile(new URL("../docs/linux-smoke-test.md", import.meta.url), "utf8");
const expectedTag = `v${packageJson.version}`;
const actualTag = process.env.GITHUB_REF_TYPE === "tag"
  ? process.env.GITHUB_REF_NAME
  : process.env.LCLIP_RELEASE_TAG;

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageJson.version)) {
  throw new Error(`package.json contains an invalid release version: ${packageJson.version}`);
}

if (!changelog.includes(`## [${packageJson.version}]`)) {
  throw new Error(`CHANGELOG.md has no section for ${packageJson.version}`);
}

if (actualTag && actualTag !== expectedTag) {
  throw new Error(`Release tag ${actualTag} does not match package version ${expectedTag}`);
}

if (!actualTag && !allowUntagged) {
  throw new Error(`No release tag was supplied; expected ${expectedTag}`);
}

const isPrerelease = packageJson.version.includes("-");
if (!isPrerelease && /\|\s*Pending\s*\|/i.test(smokeChecklist)) {
  throw new Error("Stable releases require every Linux smoke-test matrix row to be completed");
}

console.log(`${expectedTag}: ${isPrerelease ? "prerelease" : "stable"} metadata is internally consistent`);
if (!actualTag) {
  console.log("No tag supplied; validation is running in source-check mode");
}
