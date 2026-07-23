import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";

const run = promisify(execFile);
const project = dirname(dirname(fileURLToPath(import.meta.url)));
const script = join(project, "scripts", "verify-release.mjs");
const packageJson = JSON.parse(await readFile(join(project, "package.json"), "utf8"));
const expectedTag = `v${packageJson.version}`;

test("release metadata accepts the exact stable tag and distribution contract", async () => {
  const result = await run(process.execPath, [script], {
    cwd: project,
    env: { ...process.env, GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: expectedTag }
  });
  assert.match(result.stdout, /stable metadata is internally consistent/);
});

test("release metadata rejects a tag that differs from package.json", async () => {
  await assert.rejects(run(process.execPath, [script], {
    cwd: project,
    env: { ...process.env, GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: "v0.0.0" }
  }), /does not match package version/);
});
