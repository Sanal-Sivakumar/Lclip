# LClip stable release process

LClip publishes immutable Git tags only after the exact `main` commit passes the automated distribution contract. “Stable” means the supported core is tested, packaged, launch-checked, recoverable, and honestly documented; it does not mean every Linux compositor permits global shortcuts or synthetic input in the same way.

## Stable gate

1. Keep `package.json`, `package-lock.json`, and the dated `CHANGELOG.md` heading on the same semantic version.
2. Run `npm ci`, `npm run verify`, `npm audit --audit-level=high`, and `npm run verify:release` locally.
3. Push the exact release commit to `main` and wait for all `Verify LClip` jobs.
4. Confirm native x86-64 and native ARM64 jobs build the unpacked application and keep it resident for the packaged Xvfb smoke window.
5. Create one annotated tag matching the package version. Never move or recreate a published tag.
6. Wait for the release workflow to build AppImage, Debian, RPM, and portable tar.gz files on both native architectures.
7. Confirm the release also contains `install-lclip.sh`, `uninstall-lclip.sh`, `LClip.svg`, `SHA256SUMS`, and GitHub provenance attestations.
8. Wait for the post-publication x86-64 and ARM64 jobs to download the public installer, install into an isolated home directory without root, launch the downloaded runtime, and uninstall it cleanly.
9. Download at least one artifact independently, verify its checksum, and confirm the latest-download links in `README.md` resolve.
10. Record compositor-specific observations in `docs/linux-smoke-test.md` without converting missing evidence into a pass claim.

```bash
npm ci
npm run verify
npm audit --audit-level=high
npm run verify:release
git push origin main
git tag -a v1.0.1 -m "LClip 1.0.1"
git push origin v1.0.1
```

## Stable support boundary

The supported binary baseline is a current 64-bit glibc Linux distribution on x86-64 or ARM64 with a graphical desktop session. The no-root portable path does not require Node.js, npm, FUSE, or administrator access. AppImage may require FUSE unless `APPIMAGE_EXTRACT_AND_RUN=1` is used; Debian and RPM installation requires the relevant package manager and administrator authorization.

Clipboard history, offline catalogs, copying, persistence reporting, and manual-paste fallback are core stable behavior. Electron/X11 registration, Wayland portal approval, GNOME custom shortcuts, window movement, and automatic paste depend on the actual desktop and its security policy. A denied bridge must leave the selected value on the clipboard and show the manual `Ctrl+V` fallback.

## Published assets

Stable tags publish predictable names so `/releases/latest/download/…` links remain useful:

| Architecture | Portable | AppImage | Debian | RPM |
| --- | --- | --- | --- | --- |
| x86-64 | `LClip-linux-x64.tar.gz` | `LClip-linux-x64.AppImage` | `LClip-linux-x64.deb` | `LClip-linux-x64.rpm` |
| ARM64 | `LClip-linux-arm64.tar.gz` | `LClip-linux-arm64.AppImage` | `LClip-linux-arm64.deb` | `LClip-linux-arm64.rpm` |

The release also publishes `install-lclip.sh`, `uninstall-lclip.sh`, `LClip.svg`, and `SHA256SUMS`. GitHub Actions generates provenance attestations for the published files, then native x86-64 and ARM64 jobs exercise the public no-root install, packaged-runtime launch, and uninstall paths. Distribution-specific GPG package signing is not currently configured, so the checksum and GitHub attestation are the documented integrity paths.

## Rollback and recovery

The no-root installer stages the downloaded runtime, verifies it, backs up user integration files, activates the new directory, and restores the previous installation and resident process on failure. The guided source installer provides the equivalent rollback for `/opt/lclip`, shared launch integration, optional udev files, group membership, and the user daemon. Operating-system packages installed as external dependencies are intentionally not removed during rollback.

If a stable release is defective, leave its tag and artifacts immutable, document the defect, and publish a higher patch version. Never silently replace assets below an existing tag.
