---
name: buildcheck
description: Use this skill when working in the guardian/support-service-lambdas repo and you need to add/remove/bump a dependency, add an npm script, change tsconfig options, add a new handler or module, or fix a failing "buildcheck" CI check. Buildcheck is this repo's generator/checker for build files (package.json, tsconfig.json, jest config, etc.) across all handlers/modules - these files are NOT hand-edited directly.
---

# Buildcheck

Buildcheck generates and checks the build files (`package.json`, `tsconfig.json`, jest
config, etc.) for every handler in `handlers/*` and module in `modules/*` from a
programmatic definition, similar to how CDK generates CloudFormation. **Never hand-edit a
generated file** - each one starts with a `MANAGED FILE` header comment; edit the
definition instead and regenerate. The generated file list lives in the root
`BUILDCHECK.md`.

For the basic "add a dependency / bump a version / fix a failing CI check" steps, see
[`buildcheck/README.md`](../../../buildcheck/README.md) - don't duplicate them here, follow
that doc directly.

## What the README doesn't tell you (read this first if unfamiliar with the code)

- **`buildcheck/data/build.ts`** is an array of `HandlerDefinition`/`ModuleDefinition`
  objects (see the interfaces at the top of the file for all available fields:
  `dependencies`, `devDependencies`, `extraScripts`, `tsConfigExtra`,
  `testTimeoutSeconds`, `jestClearMocks`, `stack`, `functionNames`, `entryPoints`,
  `extraStages`). Each entry has a `moduleDependencies` array listing which internal
  `modules/*` it depends on - buildcheck uses this to wire up workspace deps/build order.
- **`buildcheck/data/dependencies.ts`** is a single source-of-truth catalog (`dep`,
  `devDeps`, `deprecatedDeps` maps keyed by package name). Don't hardcode a version string
  directly in `build.ts` - spread the catalog entry instead (e.g. `...dep.zod`) so every
  consumer stays in sync.
- **`buildcheck/data/scripts.ts`** holds reusable npm-script fragments (e.g. `srcOnly`,
  `openApiScripts`) that can be spread into a handler/module's `extraScripts`.
  `buildcheck/data/templates` and `buildcheck/data/snippets` hold templated file bodies
  (e.g. the snippet that renders every `BUILDCHECK.md`).
- **New handlers**: `_templates/new-lambda/*` (hygen-style `.ejs.t` files) scaffold both
  the source skeleton and a starter `build.ts` entry - use these rather than writing a
  `build.ts` entry from scratch, then run `pnpm snapshot:update`.
- **Working on buildcheck itself** (not just using it): run these from inside
  `buildcheck/`, not the repo root: `pnpm test`, `pnpm lint`, `pnpm type-check`,
  `pnpm fix-formatting`. There's also `pnpm run snapshot:clean` to remove generated files.
