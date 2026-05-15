# dooz Examples

Each subdirectory is a self-contained example project that demonstrates a different way to use dooz.
Read through them in order, or jump straight to the one that matches your situation.

| Example | What it shows |
|---|---|
| [`simple-scripts`](./simple-scripts) | Minimal config — no extension file, just command aliases |
| [`monorepo-workspace`](./monorepo-workspace) | pnpm workspace commands with a validator extension |
| [`docker-deploy`](./docker-deploy) | Docker workflow with a custom filter and push protection |
| [`git-workflow`](./git-workflow) | `.dooz/` directory layout, custom kebab filter, semver validator |
| [`full-featured`](./full-featured) | All features together: resolvers, validators, filters, specificity ranking |

---

## Running any example

From inside an example directory:

```sh
# preview a command without running it
dooz <tokens> --dooz dry

# trace how a command was resolved
dooz <tokens> --dooz explain

# use a sibling config override
dooz <tokens> --dooz ./dooz.yaml
```

Install dooz globally first if you haven't already:

```sh
npm install -g dooz
# or
pnpm install -g dooz
```
