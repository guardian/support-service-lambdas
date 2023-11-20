# support-service-lambdas [![Codacy Badge](https://api.codacy.com/project/badge/Grade/df83c14325bc4c29aeae7e529f49f8a9)](https://app.codacy.com/app/johnduffell/support-service-lambdas?utm_source=github.com&utm_medium=referral&utm_content=guardian/support-service-lambdas&utm_campaign=badger)

This is the reader revenue lambda API/orchestration layer. It is made up of lambdas, defined in the `/handlers` directory and
libraries defined in the `/libs` directory. Code in the repo is mostly Scala but for new lambdas prefer to use Typescript 
for the following reasons:
- There is a wider pool of experienced Typescript developers both within the Guardian and outside making it easier to find 
devs to work on the codebase
- It enables us to share code between server side applications, client side applications and infrastructure definitions (CDK)
- Cold start times for Typescript lambdas are typically faster than for Scala ones

Please keep all the various README in this project up to date, and improve them!
There should be one in each project and anywhere else you think it would help.

## Getting Started - Typescript
We use [pnpm](https://pnpm.io/) as a package manager so make sure you have it [installed](https://pnpm.io/installation), 
`brew install pnpm` is a simple way to do this, then run `pnpm install` from the root of the repo to install all dependencies.

Each lambda is a separate [pnpm workspace](https://pnpm.io/workspaces) which allows us to define common settings and
dependencies for all projects, add dependencies between projects build all projects at once and generally facilitates 
the management of a monorepo


Linting rules (`.eslintrc.json`), formatting rules (`.prettierrc`) and Typescript configuration (`tsconfig.json`) are all defined at the root
of the repository and use standard Guardian configuration where available. 

These can also be overridden at a per workspace level,
for instance each lambda should override the `rootdir` setting through a local `tsconfig.json` file as follows:   
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src"
  }
}
```

Dependencies can also be managed either at the root workspace level or in individual lambdas.
To add dependencies to a specific sub-project you can use [pnpm filtering](https://pnpm.io/filtering):
```shell
pnpm --filter discount-api add dayjs
```
or simply run the add command in the root directory of the subproject
```shell
pnpm add dayjs
```
To add dependencies to the workspace so that they are available to all project you can use:
```shell
pnpm --workspace-root add dayjs
```
however this should only be used for dependencies which really are necessary for all sub-projects.


Filtering can also be used to run builds or any other command on a particular sub-project, for instance:
```shell
pnpm --filter discount-api package
```
## Getting Started - Scala

1. Open the project in Intellij with Scala plugin installed
1. Open Intellij->Settings->sbt (search for it)
1. Turn on sbt shell for project loading and compilation.
1. (optional for better scala 3 support) switch the scala plugin to "nightly" or "early access" rather than Release
1. Go into "handlers" and find the relevant lambda(s), and check (or add) their Getting Started section

### Running all Integration tests
These tests do not (yet!) run automatically.

You can run the tests that hit external services by running `sbt effectsTest:test`.
This would need suitable AWS credentials to get hold of the config.
You can tag your integration new tests with `taggedAs EffectsTest`.  This ignores them from the standard `sbt test`.

NOTE: You may notice that IntelliJ doesn't compile the effects tests on-the-fly (as it does with source files) you can re-enable this behaviour by commenting out the contents of the `Seq(...)` at the end of the `val testSettings` assignent in the top-level `build.sbt` .
This is also means you can run them with the IntelliJ debugger :)

### Testing post deployment to CODE/PROD
The PROD health checks are [called by blazemeter](https://www.runscope.com/radar/wrb0ytfjy4a4) every 5 minutes.

---

## Generating CloudFormation templates:

See the [docs](./cdk/README.md) for setup and running guides.


## Adding a new lambda:
See [this doc](./handlers/HOWTO-create-lambda.md)