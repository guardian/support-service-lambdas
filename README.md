# support-service-lambdas [![Codacy Badge](https://api.codacy.com/project/badge/Grade/df83c14325bc4c29aeae7e529f49f8a9)](https://app.codacy.com/app/johnduffell/support-service-lambdas?utm_source=github.com&utm_medium=referral&utm_content=guardian/support-service-lambdas&utm_campaign=badger)

This is the reader revenue lambda API/orchestration layer. For tech debt look in [the google doc](https://docs.google.com/document/d/1A4IyEWhABoGUw01fiuS0JtuuYn2IfQFZdTA5mtrcNho/edit?usp=sharing), although it should probably be a trello column.

Please keep all the various README in this project up to date, and improve them!
There should be one in each project and anywhere else you think it would help.

---

## Philosophy
The general philosophy of this project is to keep things under review and don't be afraid to refactor things
especially the hard parts of the structure when you think they are wrong.
The PR review at the end will always let you know when people don't like the idea
but if you miss an opportunity to improve the structure, this hurts more in the long term than a good
change with poor naming.
Yes, small PRs are good, but that means small in terms of the meaning of the change, rather than small in terms
of lines touched.  If you split out some code into a separate sub-project and rename an existing one,
that is a small change because I can explain it in one sentence.  Github's failings in terms
of displaying it concisely are not your failings in making it small!

Anything that isn't a line in the sand should be questioned and changed at will.
Anything that is should be questioned too.

## Guidelines in the sand 

**There should not be too many of these!**

- **good naming** - a good name promotes cohesion - it says more about what **shouldn't** be in the construct
than what should be.  If you have a catch all name like "common" or "helpers" in mind, think again.
- **effects separation** - to promote good reuse and testability, keep all side effects in one place, and only depend
on it from the top level handlers.  Effects should be minimal, and the top level handlers should mostly be wiring.
If there's any code in either that you feel could be unit tested, it should probably be in another project.
- **one jar per lambda** - minimise the size of the deployment artifact
- **minimise dependencies (aka liabilities)** on external libraries as we have to keep them up to date, also they increase the size of the artifact

See also [this slideshow](https://docs.google.com/presentation/d/1W9bTr69QKwDRlxtjwP_TMzdpR85diUtndgJPh2H6LTo/edit?usp=sharing), which shows the original motivation.

---

## Quality matters
The testing story is not perfect at the moment!  You are responsible for getting your own changes into production safely.  However there are a few common situations you will encounter:

### Code only changes
You can be confident when making code only changes.  Run `sbt test` to run code only tests (ignores other tests).
They will automatically run on your build of your branch and when you merge to main.

Add your new tests in the normal way, and don't forget to `Run with Coverage` in IntelliJ.

### System integration points including Config loading
These tests do not (YET!) run automatically.
If you deploy to PROD without checking this, the lambdas will deploy but not actually work.

You can run the tests that hit external services by running `sbt effectsTest:test`.
This would need suitable AWS credentials to get hold of the config.
You can tag your integration new tests with `taggedAs EffectsTest`.  This ignores them from the standard `sbt test`.

NOTE: You may notice that IntelliJ doesn't compile the effects tests on-the-fly (as it does with source files) you can re-enable this behaviour by commenting out the contents of the `Seq(...)` at the end of the `val testSettings` assignent in the top-level `build.sbt` .
This is also means you can run them with the IntelliJ debugger :)

### Testing post deployment to CODE/PROD
After deploy you can't relax until you know an HTTP request will hit your lambda, and that your lambda can access any external services.
Traditional health checking doesn't happen.  You can run it in CODE and PROD by running `sbt healthCheck:test` which should run the `CODEPRODHealthCheck`.
The PROD health checks are [called by RunScope](https://www.runscope.com/radar/wrb0ytfjy4a4) every 5 minutes.


### Testing things with side effects
If you are changing the ET emails, it is worth running EmailClientSystemTest with your own email address.

---

## Howto update config
We store private config in S3.  The config for different services (e.g. Zuora and Stripe) is split out into separate files so that each lambda only has access to the secrets it needs.  This will also help with automated key rotation.

If you're making an addition, you can just copy the file from S3 for PROD and CODE, then update and upload.
Check the version in the AwsS3.scala ConfigLoad object.
`aws s3 cp s3://gu-reader-revenue-private/membership/support-service-lambdas/CODE/<config-name>-CODE.v<VERSION>.json /etc/gu/CODE/ --profile membership`
Then do the reverse to upload again.

If you're making a change that you only want to go live on deployment (and have the ability to roll back
with riffraff) then you can increment the version.  Make sure you upload the file with the new version,
otherwise it will break the existing lambda immediately.

Follow the same process to update the prod config, and for DEV there is no version number.

To check that you have done it correctly, run the [S3ConfigFilesEffectsTest](lib/s3ConfigValidator/src/test/scala/com/gu/test/S3ConfigFilesEffectsTest.scala).
That will check the relevant version can be understood by the local version of the code.

Ideally this test should be automated and your PR shouldn't be mergeable until the config is readable.

---

## Generating CloudFormation templates:

See the [docs](./cdk/README.md) for setup and running guides.
