import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const project = dirname(dirname(fileURLToPath(import.meta.url)));
const script = join(project, "scripts", "prepare-release-assets.sh");

test("release assembly checksums every public asset including the icon", async () => {
  const root = await mkdtemp(join(tmpdir(), "lclip-release-assets-"));
  const downloads = join(root, "downloads");
  const publish = join(root, "publish");

  for (const arch of ["x64", "arm64"]) {
    const source = join(downloads, `lclip-linux-${arch}-installers`);
    await mkdir(source, { recursive: true });
    for (const extension of ["AppImage", "deb", "rpm", "tar.gz"]) {
      await writeFile(join(source, `LClip-1.0.1-${arch}.${extension}`), `${arch}:${extension}\n`);
    }
  }

  await run("bash", [script, downloads, publish], { cwd: project });

  const expectedAssets = [
    "LClip-linux-x64.AppImage", "LClip-linux-x64.deb", "LClip-linux-x64.rpm", "LClip-linux-x64.tar.gz",
    "LClip-linux-arm64.AppImage", "LClip-linux-arm64.deb", "LClip-linux-arm64.rpm", "LClip-linux-arm64.tar.gz",
    "LClip.svg", "install-lclip.sh", "uninstall-lclip.sh"
  ];
  const published = await readdir(publish);
  assert.deepEqual(published.sort(), [...expectedAssets, "SHA256SUMS"].sort());

  const manifest = await readFile(join(publish, "SHA256SUMS"), "utf8");
  const entries = manifest.trim().split("\n");
  assert.equal(entries.length, expectedAssets.length);
  for (const asset of expectedAssets) {
    assert.match(manifest, new RegExp(`^[0-9a-f]{64}  ${asset.replaceAll(".", "\\.")}$`, "m"));
  }
});
