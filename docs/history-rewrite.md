# Completed `.venv` history cleanup

The repository history was rewritten on 2026-07-23 to remove an accidentally committed Python virtual environment. Deleting `.venv/` only at `HEAD` would have left hundreds of megabytes reachable from older commits; this cleanup removed those paths from every published branch before the stable release line was tagged.

## Verified result

| Measurement | Before | Rewritten history |
| --- | ---: | ---: |
| Reachable `.venv` paths | 4,158 Git objects | 0 |
| Reachable `.venv` blobs | 3,847 blobs / 260.31 MiB uncompressed | 0 |
| Packed repository size | 95.30 MiB | approximately 2.61 MiB before later stable-source additions |
| Old public `main` tip | `1d9c70fa57763f99fd539ded1fc0a0c8ecc7a215` | replaced by the rewritten stable line |

`git fsck --full --no-reflogs --unreachable` completed cleanly after temporary rewrite refs and reflogs were removed. A complete pre-rewrite recovery bundle was verified outside the repository. It is deliberately private because it contains the removed objects and must never be uploaded as a release asset, branch, tag, gist, or public archive.

## Public repository state

The rewritten stable line was pushed directly to GitHub `main` with an explicit `--force-with-lease` tied to the previously observed old tip. The lease protected remote work that might have appeared between audit and publication. Stable tags are created only from the rewritten line, and no public branch or tag may point back to the removed history.

Maintainers can audit the current public refs with:

```bash
git ls-remote --heads --tags origin
git rev-list --objects --all | grep ' \.venv/' && echo "unexpected .venv history" || echo "clean"
git fsck --full --no-reflogs --unreachable
```

Do not create a compatibility branch pointing at the pre-rewrite commit. That would make the removed payload reachable again.

## Contributor migration

A fresh clone is the safest migration and gives contributors the smaller repository immediately:

```bash
git clone https://github.com/Sanal-Sivakumar/Lclip.git
```

Contributors preserving local work should first create a private bundle or patch series, fetch rewritten `main`, and replay only the desired changes. Old topic branches should be rebased or cherry-picked onto rewritten `main`, never merged wholesale. Merging an old branch would reintroduce the removed object graph.

## Recovery rule

The private recovery bundle exists only for emergency local recovery. Restoring from it requires an explicit maintainer decision and a new cleanup pass before anything is pushed. Normal development, installation, and release work must use the rewritten GitHub history.
