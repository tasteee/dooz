# monorepo-workspace

A pnpm monorepo where every per-package command goes through a `packageExists` validator, preventing typos from firing off against packages that don't exist.

Specificity ranking is also at work here: `build all` is a more specific match than `build <name>` and will always win when you pass `all` literally.

---

## Workspace packages

This example assumes packages named `ui`, `core`, `api`, `utils`, and `config` all scoped under `@scope`.

---

## Commands

| Input | Runs |
|---|---|
| `dooz install` | `pnpm install` |
| `dooz build all` | `pnpm -r run build` |
| `dooz build ui` | `pnpm --filter @scope/ui run build` |
| `dooz build core --watch` | `pnpm --filter @scope/core run build --watch` |
| `dooz test all` | `pnpm -r run test` |
| `dooz test api --coverage` | `pnpm --filter @scope/api run test --coverage` |
| `dooz lint utils` | `pnpm --filter @scope/utils run lint` |
| `dooz add ui react` | `pnpm --filter @scope/ui add react` |
| `dooz remove ui react` | `pnpm --filter @scope/ui remove react` |
| `dooz run config generate` | `pnpm --filter @scope/config run generate` |

---

## Features shown

- **Specificity ranking** — `build all` beats `build <name>` for the token `all`; dooz picks the more specific match automatically.
- **Named captures** — `<name>` is inserted directly into the pnpm `--filter` flag.
- **Variadic passthrough** — `[...rest]` forwards any extra flags (e.g. `--watch`, `--coverage`) unchanged.
- **Validator** — `packageExists` in `dooz.js` rejects package names not in the known list before the command runs.
- **Extension file** — `dooz.js` sits alongside `dooz.yaml` and is discovered automatically.

---

## Try it

```sh
# safe — ui is a known package
dooz build ui --dooz dry

# rejected by the packageExists validator
dooz build missing --dooz dry

# specificity: this matches "build all", not "build <name>"
dooz build all --dooz explain
```

---

## Adapting for your workspace

Replace `KNOWN_PACKAGES` in `dooz.js` with a live lookup — for example, scanning `packages/` with `fs.readdirSync` — so the validator always reflects the real workspace:

```js
import fs from 'fs'
import path from 'path'

const KNOWN_PACKAGES = fs
  .readdirSync(path.join(process.cwd(), 'packages'))
  .filter((entry) => fs.statSync(path.join(process.cwd(), 'packages', entry)).isDirectory())
```
