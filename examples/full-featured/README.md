# full-featured

A single example that exercises every dooz capability:

- **Resolvers** — derive variables from captured args before the template is rendered
- **Validators** — guard commands with named checks that run after resolvers
- **Custom filters** — `kebab` and `truncate` join the built-in `lower`, `upper`, `join`, `json`
- **Specificity ranking** — `test all` beats `test <name>` for the literal token `all`
- **Resolver dependency** — `packageKind` requires `name` and provides `kind`; it runs only when listed in `uses`
- **Multi-validator** — `deploy` lists two validators; both must pass
- **Dry / explain modes** — see any command's rendered form or full trace without running it

---

## Commands

### Test commands

| Input | Runs |
|---|---|
| `dooz test all` | `pnpm test` |
| `dooz test all --watch` | `pnpm test --watch` |
| `dooz test core` | `pnpm --filter core run test` *(core uses `run`)* |
| `dooz test ui --coverage` | `pnpm --filter ui exec test --coverage` *(ui uses `exec`)* |
| `dooz test missing` | ❌ rejected by `packageExists` |

### Build commands

| Input | Runs |
|---|---|
| `dooz build api` | `pnpm --filter api run build` |
| `dooz build utils --minify` | `pnpm --filter utils run build --minify` |

### Script runner

| Input | Runs |
|---|---|
| `dooz run ui storybook` | `pnpm --filter ui run storybook` |
| `dooz run api migrate -- --env staging` | `pnpm --filter api run migrate -- --env staging` |

### Filter demos

| Input | Output |
|---|---|
| `dooz tag UI` | `echo ui` |
| `dooz slug My New Feature` | `echo my-new-feature` |
| `dooz flags app --watch --coverage` | `echo "app -> --watch | --coverage"` |
| `dooz json a b c` | `echo ["a","b","c"]` |

### Deployment

| Input | Runs |
|---|---|
| `dooz deploy staging web` | `./scripts/deploy.sh staging web` |
| `dooz deploy production api` | `./scripts/deploy.sh production api` |
| `dooz deploy nowhere web` | ❌ rejected by `environmentExists` |
| `dooz deploy staging unknown` | ❌ rejected by `serviceExists` |
| `dooz info staging` | `echo "Region: us-east-1, Cluster: staging-cluster"` |
| `dooz info production` | `echo "Region: us-west-2, Cluster: prod-cluster"` |

---

## Features shown

- **`packageKind` resolver** — reads `name`, returns `kind` (`run` or `exec`), inserted into the output template.
- **`environmentInfo` resolver** — reads `environment`, returns `region` and `cluster` for use in the template.
- **Three validators** — `packageExists`, `environmentExists`, `serviceExists` each have a clear `description` used as the failure message.
- **`kebab` custom filter** — converts space-separated words to a lowercase hyphenated slug.
- **`truncate` custom filter** — shortens a value to a max character count and appends `…`; takes a numeric argument: `{{name | truncate(10)}}`.
- **Specificity ranking** — `test all [...rest]` is ranked higher than `test <name> [...rest]` because `all` is a literal token, so it always wins for that exact input.

---

## Try it

```sh
# resolver trace — watch packageKind derive "kind" from "name"
dooz test core --dooz explain

# multi-validator trace — both environmentExists and serviceExists run
dooz deploy staging web --dooz explain

# dry run to see the resolved region and cluster
dooz info production --dooz dry

# filter in action
dooz slug My New Feature --dooz dry

# specificity: this hits "test all", not "test <name>"
dooz test all --watch --dooz explain
```
