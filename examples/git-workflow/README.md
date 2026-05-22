# git-workflow

Git branch, commit, tag, and sync commands wrapped in dooz.

This example stores its config inside a `.dooz/` directory instead of a root-level `dooz.yaml`, which keeps the project root clean. dooz discovers `dooz.yaml` and `dooz.js` there automatically.

A custom `kebab` filter converts free-form branch description text into valid Git branch names. A `isSemanticVersion` validator enforces that release branches and tags follow `MAJOR.MINOR.PATCH`.

---

## Commands

| Input | Runs |
|---|---|
| `dooz feature add user auth` | `git checkout -b feature/add-user-auth` |
| `dooz fix broken login redirect` | `git checkout -b fix/broken-login-redirect` |
| `dooz release 2.1.0` | `git checkout -b release/2.1.0` |
| `dooz release next` | ❌ rejected — not a semver string |
| `dooz commit "fix typo in docs"` | `git commit -m "fix typo in docs"` |
| `dooz push` | `git push origin HEAD` |
| `dooz push --force-with-lease` | `git push origin HEAD --force-with-lease` |
| `dooz pull` | `git pull --rebase origin HEAD` |
| `dooz tag 2.1.0` | `git tag v2.1.0` |
| `dooz push tags` | `git push origin --tags` |
| `dooz stash` | `git stash` |
| `dooz stash pop` | `git stash pop` |
| `dooz rebase` | `git rebase origin/main` |
| `dooz log -20` | `git log --oneline -20` |

---

## Features shown

- **`.dooz/` directory layout** — both `dooz.yaml` and `dooz.js` live in `.dooz/`; dooz finds them with no flags needed.
- **Custom `kebab` filter** — multi-word branch names like `add user auth` become `add-user-auth` automatically.
- **Semver validator** — `isSemanticVersion` blocks invalid version strings before any Git command runs.
- **Specificity ranking** — `push tags` is a more specific literal match than `push [...rest]`, so it wins when you type `push tags`.
- **Variadic passthrough** — `push`, `pull`, `stash`, and `log` all forward extra tokens unchanged.

---

## Try it

```sh
# kebab filter in action
dooz feature add user auth --dooz dry

# validator blocks a bad version
dooz release next --dooz dry

# full trace showing filter application and pattern selection
dooz feature add user auth --dooz explain
```
