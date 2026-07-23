# Coordinated `.venv` history cleanup

The local repository history was rewritten on 2026-07-23 to remove an accidentally committed Python virtual environment. The current tree already ignored `.venv/`; this operation removed the old binary payload from every rewritten commit rather than merely deleting it at `HEAD`.

## Verified local result

| Measurement | Before | After |
| --- | ---: | ---: |
| Reachable `.venv` paths | 4,158 Git objects | 0 |
| Reachable `.venv` blobs | 3,847 blobs / 260.31 MiB uncompressed | 0 |
| Packed repository size | 95.30 MiB | 2.61 MiB |
| `main` tip | `1d9c70fa57763f99fd539ded1fc0a0c8ecc7a215` | `16fe20172c3d93e7198006e989917f74bf67be8e` |

`git fsck --full --no-reflogs --unreachable` completed cleanly after the temporary rewrite refs and reflogs were removed. A complete pre-rewrite bundle was created and verified outside the repository before cleanup. Keep that bundle private: it deliberately contains the history that was removed.

## Remote coordination gate

At the time of the rewrite, the GitHub remote exposed only `refs/heads/main` at the old tip and no tags. The local rewrite does **not** change GitHub by itself. Before updating the remote:

1. Freeze merges and pushes to `main` and tell every contributor that commit IDs will change.
2. Confirm `git ls-remote --heads --tags origin` still reports only the expected old `main` tip. If it changed, stop and reconcile the new work instead of forcing over it.
3. Run the complete verification suite on `codex/production-readiness`.
4. Push the rewritten production branch to `main` with an explicit lease against the observed old remote hash:

```bash
git push --force-with-lease=refs/heads/main:1d9c70fa57763f99fd539ded1fc0a0c8ecc7a215 origin codex/production-readiness:main
```

5. Re-run `git ls-remote --heads --tags origin` and verify that `main` points to the intended production commit and no old branch or tag preserves the removed history.
6. Unfreeze the repository only after CI passes on rewritten `main`.

Do not use an unqualified `--force`; the explicit lease prevents overwriting remote work that appeared after the coordination check.

## Contributor migration

A fresh clone is the safest migration. Contributors who need to preserve local work should create their own bundle or patch series before fetching the rewritten history. A contributor reusing a checkout must first confirm that its working tree is clean, fetch the rewritten remote, and then deliberately realign local branches. Old topic branches should be rebased by replaying the desired patches onto rewritten `main`, not merged wholesale, because merging an old branch makes the removed objects reachable again.

Create release tags only after the remote rewrite is complete. Never publish the private recovery bundle or create a public archive tag pointing at the old history.
