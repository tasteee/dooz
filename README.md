# dooz

```sh
# take your pick
npm install -g dooz
pnpm install -D dooz
bun install -g dooz
yarn global add dooz
```

## Stop memorizing long commands.

dooz lets you define simple, human-friendly command patterns and map them to real executable argv commands with safe interpolation, validation, and explainability.

If your team keeps repeating commands like:

- `pnpm --filter @scope/some-package run build`
- `pnpm --filter @scope/some-package run test -- --watch`
- `pnpm --filter @scope/some-package exec vitest --coverage`

then dooz gives you a clean, declarative layer on top:

- `dooz build some-package`
- `dooz test some-package --watch`
- `dooz exec some-package vitest --coverage`

Fast to learn, easy to share, hard to break.

---

## Why dooz

CLI workflows usually break down in the same places:

- command syntax is verbose and inconsistent
- teams copy/paste variants that drift over time
- workspace-aware values need custom scripts
- shell quoting bugs are easy to introduce
- nobody can explain why a specific command matched

dooz solves this by combining:

- token-based pattern matching
- captured arguments and passthrough args
- output templates with filters
- explicit resolvers and validators
- argv-first execution (not unsafe shell string concatenation)
- dry and explain modes for transparency

---

## Quick Start

### 1. Create a config file

Create `dooz.yaml`:

```yaml
commands:
  - description: Run tests for one package
    input: test <name> [...rest]
    output: pnpm --filter {{name}} run test {{rest}}
```

### 2. Run a command

```
dooz test ui --watch
```

Or just `do` it:

```
do test ui --watch
```

### 3. Preview the final command

dooz lets you see what the final command will be without running it. This is great for learning and debugging.

```
do test ui --watch --dooz dry
```

Output:

```
pnpm --filter ui run test --watch
```

---

## Command Lifecycle

For each invocation, dooz runs this pipeline:

1. Parse CLI arguments and `--dooz` control tokens.
2. Discover config file.
3. Load and validate config schema.
4. Discover and load extension file (optional).
5. Validate command references (`uses`, `validates`, filters).
6. Compile patterns and select the best match.
7. Capture arguments from input tokens.
8. Run resolvers.
9. Run validators.
10. Render output template into final argv.
11. Either explain, dry-run, or execute.

---

## CLI Usage

```
dooz <command tokens> --dooz [dry explain path]
```

### `--dooz` control tokens

- `dry`: print rendered command and exit.
- `explain`: print detailed execution trace and exit.
- `<path>`: optional single file path override.

### Flag behavior

- `--dooz` can appear once and everything after it is reserved for control tokens.
- any combination of `dry` and `explain` is valid.
- `explain` takes precedence over `dry` when both are present.
- at most one path token is allowed after `--dooz`.
- path ending with `.yaml` or `.yml` overrides config file.
- path ending with `.js` or `.ts` overrides extension file.
- other file extensions are treated as config-path overrides.

Examples:

- `dooz whatever --dooz dry`
- `dooz whatever whateva --dooz explain`
- `dooz whatever whateva --dooz dry explain`
- `dooz whatever whateva --dooz explain /foo/dooz.js`
- `dooz whatever whateva --dooz dry explain ./bar/baz/dooz.ts`

---

## Config Discovery

Without an override path, dooz searches upward from the current directory and stops at git root (or filesystem root if no git repo exists).

At each directory level, it checks in this order:

1. `dooz.yaml`
2. `dooz.yml`
3. `.dooz/dooz.yaml`
4. `.dooz/dooz.yml`

With a `--dooz` path token targeting config (for example `./dooz.yaml`):

- discovery is skipped
- relative paths are resolved from current working directory
- path must exist or the command fails early

---

## Extension Discovery

Extensions are optional. If present, dooz discovers them with the same upward walk rules.

Order:

1. `dooz.ts`
2. `dooz.js`
3. `.dooz/dooz.ts`
4. `.dooz/dooz.js`

Important:

- extension discovery is anchored to the resolved config directory
- a `--dooz` path token ending in `.js` or `.ts` overrides extension discovery directly
- if no extension file is found, only built-in filters are available

---

## dooz.yaml Schema

```yaml
commands:
  - description: Optional human description
    input: test <name> [...rest]
    output: pnpm --filter {{name}} run test {{rest}}
    uses: [packageKind]
    validates: [packageExists]
```

### Fields

- `input` (required, string): token pattern
- `output` (required, string): template rendered into argv
- `description` (optional, string)
- `uses` (optional, string[]): resolvers to run
- `validates` (optional, string[]): validators to run

Validation includes:

- required fields and non-empty strings
- `uses` and `validates` arrays must contain non-empty strings
- referenced resolvers, validators, and filters must exist
- guaranteed ambiguous equal-specificity patterns are rejected

---

## Pattern Syntax and Matching

dooz patterns are token-based, not regex strings.

### Token types

- literal token: `test`
- named single-token capture: `<name>`
- variadic remainder capture: `[...rest]`

### Rules

- `[...rest]` can appear only as the final token
- invalid capture syntax fails at config load and validation
- unmatched extra tokens fail when no variadic capture exists

### Specificity ranking

When multiple patterns match, dooz chooses the most specific pattern:

- literal is more specific than capture
- capture is more specific than variadic
- if equal so far, longer pattern wins

Examples:

- `test all [...rest]` beats `test <name> [...rest]` for `test all --watch`
- `run <name> <script>` beats `run <name> [...rest]` for exact two-token tail

---

## Captures and Passthrough Mechanics

Given:

```yaml
input: test <name> [...rest]
output: pnpm --filter {{name}} run test {{rest}}
```

Input:

```bash
dooz test ui --watch "some flag"
```

Captured values:

- `name` -> `"ui"`
- `rest` -> `["--watch", "some flag"]`

Rendered argv:

```json
["pnpm", "--filter", "ui", "run", "test", "--watch", "some flag"]
```

`"some flag"` remains one argv slot.

---

## Template Syntax

Interpolation syntax:

- `{{name}}`
- `{{rest}}`
- `{{rest | join(' ') | lower}}`

Filter chains execute left to right.

### Argv rendering semantics

These mechanics are core to dooz safety and predictability:

1. Literal text between interpolations is split on whitespace into argv tokens.
2. Interpolation resolving to a string becomes one argv token.
3. Interpolation resolving to a string array is spliced as multiple argv tokens.
4. Array elements are not split further.
5. Missing variables fail with a clear error.

### Filter argument parsing

Filter arguments are parsed as YAML values inside the parentheses.

Examples:

- `{{rest | join(',')}}`
- `{{rest | join(' ')}}`
- `{{rest | join(" | ")}}`

---

## Built-in Filters

dooz includes these filters by default:

- `join(separator)`
- `lower`
- `upper`
- `json`

Behavior details:

- `join` only transforms array values. If no separator is provided, default is `,`.
- `lower` and `upper` stringify then transform.
- `json` applies `JSON.stringify`.

---

## Extensions: Resolvers, Validators, Filters

Create `dooz.js` or `dooz.ts` and export a default object:

```ts
const packageKind = {
  name: "packageKind",
  description: "Resolve package command kind",
  requires: ["name"],
  provides: ["kind"],
  resolve: async (context) => {
    const packageName = context.args.name;
    const kind = packageName === "core" ? "run" : "exec";
    return { kind };
  },
};

const packageExists = {
  name: "packageExists",
  description: "Package must exist in workspace",
  requires: ["name"],
  validate: async (context) => {
    const packageName = context.args.name;
    return packageName !== "missing";
  },
};

const kebab = {
  name: "kebab",
  apply: (value) => {
    return String(value).toLowerCase().replaceAll(" ", "-");
  },
};

export default {
  resolvers: [packageKind],
  validators: [packageExists],
  filters: [kebab],
};
```

---

## Resolver Mechanics

Resolvers run only when listed in `uses`.

### What resolvers can do

- read captured args via `context.args`
- read current variable context via `context.vars`
- return a flat object of derived variables

### Enforcement rules

- resolver must exist
- `provides` is required
- every `provides` key must appear in returned output
- returned output cannot include undeclared keys
- output keys cannot collide with existing variables
- resolver `requires` must be satisfiable
- dependency cycles are rejected

### Execution order

- starts from `uses` list
- duplicate names are de-duplicated
- dependency-aware reordering is applied when needed
- deterministic ordering is preserved for equally ready resolvers

---

## Validator Mechanics

Validators run only when listed in `validates`, after resolvers.

### Validator outcomes

- return `true`: pass
- return `false`: fail
- throw or reject: fail

If a validator returns `false` and has a `description`, that description is used as the failure message.

`requires` is enforced before each validator runs.

---

## Explain Mode

```bash
dooz test ui --watch --dooz explain
```

Explain output includes:

- resolved config path
- resolved extension path (or `none`)
- matched pattern
- captured arguments
- resolver trace and outputs
- validator trace
- output template
- rendered display command
- final argv array

Great for debugging and onboarding.

---

## Dry Run Mode

```bash
dooz test ui --watch --dooz dry
```

Dry run prints the rendered command string only. Nothing is executed.

Display behavior:

- values containing whitespace or quotes are quoted for readability
- command stays copyable and close to what will execute

---

## Error Model

dooz uses typed error categories and clear messages.

Core categories include:

- `config-parse-error`
- `config-schema-error`
- `pattern-parse-error`
- `no-match-error`
- `ambiguous-match-error`
- `missing-variable-error`
- `resolver-failure-error`
- `validator-failure-error`
- `filter-failure-error`
- `execution-failure-error`

This keeps failures actionable and easy to diagnose.

---

## Complete Example Config

```yaml
commands:
  - description: Test every package
    input: test all [...rest]
    output: pnpm test {{rest}}

  - description: Test one package with passthrough flags
    input: test <name> [...rest]
    output: pnpm --filter {{name}} {{kind}} test {{rest}}
    uses: [packageKind]
    validates: [packageExists]

  - description: Build one package
    input: build <name> [...rest]
    output: pnpm --filter {{name}} run build {{rest}}
    validates: [packageExists]

  - description: Run any script in a package
    input: run <name> <script> [...rest]
    output: pnpm --filter {{name}} run {{script}} {{rest}}
    validates: [packageExists]

  - description: Print lowercased package name
    input: tag <name>
    output: echo {{name | lower}}

  - description: Pretty-print extra args
    input: flags <name> [...rest]
    output: echo "{{name}} -> {{rest | join(' | ')}}"
```

---

## Development

```bash
pnpm install
pnpm test
pnpm build
```

Build output:

- `build/index.js`
- executable with node shebang

---

## Philosophy

dooz is intentionally narrow and practical.

It is not trying to be a scripting language.

It gives teams a reliable middle ground between fragile aliases and heavyweight task frameworks:

- declarative
- safe
- extensible where it matters
- transparent when something goes wrong

If your repo has command chaos, dooz is a calm, useful upgrade.
