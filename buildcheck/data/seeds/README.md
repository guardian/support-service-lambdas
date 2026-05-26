# Buildcheck Seeds

Seeds generate the initial boilerplate for a new lambda.

Unlike managed files (which buildcheck owns and regenerates on every `snapshot:update`), seed output is written once and then owned by the developer — you edit the generated files directly from that point on.

If you want to create a new lambda, follow the instructions here - [handlers/HOWTO-create-lambda.md](../../../handlers/HOWTO-create-lambda.md)

## Seed specific documentation

[api-lambda README.md](api-lambda/README.md)

## What does a seed look like?

Each seed lives in its own subdirectory under [`data/seeds/`](data/seeds/), here is an example:

```
data/
  seeds/
    types.ts                 ← types specific to seeds (as opposed to managed)
    _generated_dirIndex.ts   ← auto generated index of available seeds
    api-lambda/
      index.ts               ← seed specific flags and post-processing commands
      README.md
      templates/             ← template files (directory mirrors target repo structure)
        .github/workflows/
          ci-typescript.yml.inserts.ts
        cdk/
          bin/
            cdk.ts.inserts.ts
          lib/
            _lambdaName_.ts.ts
        handlers/
          _lambdaName_/
            src/
              index.ts.ts
              ...
            ...
```

The `.ts`  (and `.inserts` where applicable) extension on each template file is stripped when resolving the target path.
Token substitution (e.g. `_lambdaName_`) is handled by the seed's `resolveTargetPath`.

## Editing an existing seed template

The template files are inside each seed inside [`data/seeds/`](data/seeds/) under `templates`.  For ease of use, the directory structure mirrors that of the workspace.

1. find the template and make your changes
1. test them as per the following section

## Testing changes

Testing changes can be tricky as the tool edits workspace files when you run it.  This is the recommended method to edit and test a change:

1. commit your change locally (don't push yet)
1. Run the seed: `pnpm seed <seed-name> --key=value ...` (see the seed's own README.md for the exact command)
1. Review the generated output with `git diff`
1. Roll back the generated files: `git checkout HEAD -- .`
1. Amend your template commit and repeat until happy, then push

## What a template file can return

These have a default export — a function that takes the parsed args and returns a suitable value.

### Normal template files (named `FILENAME.ts`)

These define an entire file and return one of:

**`string`** — written verbatim to the target file:
```ts
export default ({ lambdaName }: TemplateParams): string =>
  `export const name = '${lambdaName}';\n`;
```

**`Record<string, unknown>`** — serialised automatically by file extension (`.yaml` via `js-yaml`, `.json` via `JSON.stringify`):
```ts
export default ({ lambdaName }: TemplateParams) => ({
  name: lambdaName,
  version: '1.0.0',
});
```

**`null`** — skips the file entirely (useful for conditional files like an optional OpenAPI spec).

### Insertion template files (named `FILENAME.inserts.ts`)

These inject content into an existing file before a named marker line, rather than creating a new file. The `.inserts` part is stripped to derive the target filename — e.g. `cdk/bin/cdk.ts.inserts.ts` targets `cdk/bin/cdk.ts`:
```ts
export default ({ lambdaName }: TemplateParams): InsertChunks => ({
  chunks: [
    {
      marker: '# MARKER new-lambda: list',
      content: `  - ${lambdaName}`,
    },
  ],
});
```

## Adding a new template file to an existing seed

1. Create a `.ts` file (or `.inserts.ts` for insertions) under `data/seeds/<seed-name>/templates/` at the path that mirrors where the output should be written (you can rewrite dynamic path elements using your index.ts)
1. Export a default function returning one of the types above
1. Test as per the Testing section above

## Adding a new seed package

1. Create `data/seeds/<seed-name>/index.ts` — this is the seed index file.
It must default-export an object satisfying [`SeedIndex<T>`](types.ts):
   - `argsSchema` — a Zod object schema defining the command line flags; the inferred type becomes `T`.
   - `postProcessCommands(opts: T): string[]` — shell commands to run after files are written (e.g. snapshot updates)
   - `resolveTargetPath(path: string, opts: T): string` — filename transformations to convert placeholders to real paths (e.g. replace `_lambdaName_` with the actual name)
1. Create a `data/seeds/<seed-name>/templates/` directory and add one or more template files as described above
1. Test as per the Testing section above

## Interactive prompts

When you run `pnpm seed <seed-name>` without valid flags, buildcheck prompts you interactively
based on the descriptions on the schema.
