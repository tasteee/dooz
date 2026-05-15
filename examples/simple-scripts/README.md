# simple-scripts

The simplest possible dooz setup: a single `dooz.yaml` with no extension file.

Every command is a short alias for a longer `npm` or tool invocation. No resolvers, no validators, no captures — just clean pattern-to-command mappings.

---

## Commands

| Input | Runs |
|---|---|
| `dooz start` | `npm run dev` |
| `dooz build` | `npm run build` |
| `dooz build --sourcemap` | `npm run build --sourcemap` |
| `dooz test` | `npm test` |
| `dooz test --watch` | `npm test --watch` |
| `dooz lint` | `eslint src --ext .ts,.tsx` |
| `dooz format` | `prettier --write src` |
| `dooz typecheck` | `tsc --noEmit` |
| `dooz clean` | `rm -rf dist` |

---

## Features shown

- **Literal patterns** — `start`, `lint`, `format`, `typecheck`, `clean` are exact matches with no captures.
- **Variadic passthrough** — `build [...rest]` and `test [...rest]` forward any extra flags straight to the underlying command.
- **Zero extension file** — no resolvers, validators, or custom filters needed.

---

## Try it

```sh
# see the exact command that will run, without running it
dooz build --sourcemap --dooz dry

# trace the full resolution
dooz test --watch --dooz explain
```
