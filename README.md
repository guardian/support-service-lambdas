# support-service-lambdas [![Codacy Badge](https://api.codacy.com/project/badge/Grade/df83c14325bc4c29aeae7e529f49f8a9)](https://app.codacy.com/app/johnduffell/support-service-lambdas?utm_source=github.com&utm_medium=referral&utm_content=guardian/support-service-lambdas&utm_campaign=badger)

This is the reader revenue lambda API/orchestration layer.

Please keep all the various README in this project up to date, and improve them!
There should be one in each project and anywhere else you think it would help.

## Getting Started

This is only up to date by people using it and hitting problems!  So please edit this ReadMe if something is not clear for you.

1. Open the project in Intellij with Scala plugin installed
1. Open Intellij->Settings->sbt (search for it)
1. Turn on sbt shell for project loading and compilation.
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
