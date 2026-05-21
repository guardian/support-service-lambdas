# Buildcheck Seeds

Seeds generate the initial boilerplate for a new lambda.

Unlike managed files (which buildcheck owns and regenerates on every `snapshot:update`), seed output is written once and then owned by the developer — you edit the generated files directly from that point on.

If you want to create a new lambda, follow the instructions here - [handlers/HOWTO-create-lambda.md](../handlers/HOWTO-create-lambda.md)

## Seed specific documentation

[new-api-lambda-README.md](data/seeds/new-api-lambda-README.md)

## Editing an existing seed template

The template files are under [`data/seeds/<seed-name>`](data/seeds/).  For ease of use, the directory structure mirrors that of the workspace.

1. find the template and make your changes
1. test them as per the following section

## Testing changes

Testing changes can be tricky as the tool edits workspace files when you run it.  This is the recommended method to edit and test a change:

1. commit your change locally (don't push yet)
1. Run the seed: `pnpm --filter buildcheck seed <seed-name> --key=value ...` (see the seed's own README for the exact command)
1. Review the generated output with `git diff`
1. Roll back the generated files: `git checkout HEAD -- .`
1. Amend your template commit and repeat until happy, then push

## What a template file can return

Each file under [`data/seeds/<seed-name>/`](data/seeds/) is a TypeScript module with a default export — a function that takes the parsed args and returns one of:

**`string`** — written verbatim to the target file:
```ts
export default ({ lambdaName }: GenerationOptions): string =>
  `export const name = '${lambdaName}';\n`;
```

**`Record<string, unknown>`** — serialised automatically by file extension (`.yaml` via `js-yaml`, `.json` via `JSON.stringify`):
```ts
export default ({ lambdaName }: GenerationOptions) => ({
  name: lambdaName,
  version: '1.0.0',
});
```

**`InsertChunks`** — injects content into an existing file before a named marker line, rather than creating a new file.
```ts
export default ({ lambdaName }: GenerationOptions): InsertChunks => ({
  chunks: [
    {
      marker: '# MARKER new-lambda: list',
      content: `  - ${lambdaName}`,
    },
  ],
});
```

**`null`** — skips the file entirely (useful for conditional files like an optional OpenAPI spec).

## Adding a new template file to an existing seed

1. Create a `.ts` file under [`data/seeds/<seed-name>/`](data/seeds/) at the path that mirrors where the output should be written (use `_lambdaName_` as a token if the path should contain the lambda name)
1. Export a default function returning one of the types above
1. Test as per the Testing section above

## Adding a new seed package

1. Create `data/seeds/<seed-name>.ts` — this is the seed index file.
It must default-export an object satisfying [`SeedGenerator<T>`](data/types.ts):
   - `argsSchema` — a Zod object schema defining the command line flags; the inferred type becomes `T`
   - `postProcessCommands(opts: T): string[]` — shell commands to run after files are written (e.g. snapshot updates)
   - `resolveTargetPath(path: string, opts: T): string` — filename transformations to convert placeholders to real paths (e.g. replace `_lambdaName_` with the actual name)
1. Create a [`data/seeds/<seed-name>/`](data/seeds/) directory and add one or more template files as described above
1. Test as per the Testing section above

## Data folder layout

Each seed consists of a paired index file and directory under [`data/seeds/`](data/seeds/), here is an example:

```
data/
  seeds/
    new-api-lambda.ts          ← seed index: zod schema, postProcess, resolveTargetPath
    new-api-lambda/            ← template files (directory mirrors target repo structure)
      .github/workflows/
        ci-typescript.yml.ts   ← InsertChunks: injects into the CI workflow
      cdk/
        lib/
          _lambdaName_.ts.ts   ← generates cdk/lib/<lambdaName>.ts
      handlers/
        _lambdaName_/
          src/
            index.ts.ts        ← generates handlers/<lambdaName>/src/index.ts
```

The `.ts` extension on each template file is stripped when resolving the target path. Token substitution (e.g. `_lambdaName_`) is handled by the seed's `resolveTargetPath`.
