# LClip release process

LClip uses tags as the only publication trigger. A successful source build is necessary, but it is not treated as proof that GNOME, KDE, Wayland, X11, automatic paste, or ARM64 hardware integration works.

## Beta gate

1. Set the same prerelease version in `package.json`, `package-lock.json`, and `CHANGELOG.md`.
2. Run `npm ci`, `npm run verify`, `npm audit --audit-level=high`, and `npm run verify:release`.
3. Exercise `npm run smoke:linux` and record the tested machines in `docs/linux-smoke-test.md`. Pending rows are allowed for beta tags and must be described in the release notes.
4. Commit the exact source to release, then create an annotated tag such as `v1.0.0-beta.1`.
5. Push the branch and that one tag. Never retag a published version.
6. Confirm both native GitHub jobs produced x86-64 and ARM64 AppImage, Debian, and RPM files.
7. Download an installer for each architecture, verify it against `SHA256SUMS`, and review the generated build attestation before promoting the release.

```bash
npm ci
npm run verify
npm audit --audit-level=high
npm run verify:release
git tag -a v1.0.0-beta.1 -m "LClip 1.0.0-beta.1"
git push origin main
git push origin v1.0.0-beta.1
```

## Stable gate

Stable versions must not contain a prerelease suffix. `scripts/verify-release.mjs` refuses a stable version while the Linux matrix still contains `Pending` rows. Before removing the suffix:

- complete and date the GNOME Wayland, KDE Wayland, X11, and ARM64 matrix;
- verify install, upgrade, forced-failure rollback, autostart, shortcut, paste, persistence-failure visibility, GIPHY cancellation, uninstall, and checksum paths;
- promote only the commit that produced the tested artifacts;
- update direct-download copy and the changelog from verified evidence.

## Published assets

Every tag publishes predictable asset names so documentation can link directly to a file:

| Architecture | AppImage | Debian | RPM |
| --- | --- | --- | --- |
| x86-64 | `LClip-linux-x64.AppImage` | `LClip-linux-x64.deb` | `LClip-linux-x64.rpm` |
| ARM64 | `LClip-linux-arm64.AppImage` | `LClip-linux-arm64.deb` | `LClip-linux-arm64.rpm` |

The same release includes `SHA256SUMS`. GitHub's release workflow also creates provenance attestations for the published files.

## Rollback

If an installer fails during an upgrade, `scripts/install-system.sh` restores the previous `/opt/lclip` bundle automatically. If a published beta is defective, leave its tag immutable, mark the GitHub release clearly, and publish a higher patch or prerelease version. Do not silently replace release assets under an existing tag.
