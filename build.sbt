import Dependencies._

val scalaSettings = Seq(
  scalaVersion := "2.13.3",
  version      := "0.0.1",
  organization := "com.gu",
  scalacOptions ++= Seq(
    "-deprecation",
    "-encoding", "UTF-8",
    "-feature",
    "-target:jvm-1.8",
    "-language:existentials",
    "-language:higherKinds",
    "-language:implicitConversions",
    "-unchecked",
    "-Xlint",
    "-Ywarn-dead-code",
    "-Ywarn-numeric-widen",
    "-Ywarn-value-discard"
  ),
  fork in Test := true,
  {
    import scalariform.formatter.preferences._
    scalariformPreferences := scalariformPreferences.value
      .setPreference(DanglingCloseParenthesis, Force)
      .setPreference(SpacesAroundMultiImports, false)
      .setPreference(NewlineAtEndOfFile, true)
  },

  autoCompilerPlugins := true,
  resolvers += "Guardian Platform Bintray" at "https://dl.bintray.com/guardian/platforms"
)

// fixme this whole file needs splitting down appropriately

lazy val EffectsTest = config("effectsTest") extend(Test) describedAs("run the edge tests")
lazy val HealthCheckTest = config("healthCheck") extend(Test) describedAs("run the health checks against prod/code")
val testSettings = inConfig(EffectsTest)(Defaults.testTasks) ++ inConfig(HealthCheckTest)(Defaults.testTasks) ++ Seq(
  testOptions in Test += Tests.Argument("-l", "com.gu.test.EffectsTest"),
  testOptions in Test += Tests.Argument("-l", "com.gu.test.HealthCheck"),

  testOptions in EffectsTest -= Tests.Argument("-l", "com.gu.test.EffectsTest"),
  testOptions in EffectsTest -= Tests.Argument("-l", "com.gu.test.HealthCheck"),
  testOptions in EffectsTest += Tests.Argument("-n", "com.gu.test.EffectsTest"),

  testOptions in HealthCheckTest -= Tests.Argument("-l", "com.gu.test.EffectsTest"),
  testOptions in HealthCheckTest -= Tests.Argument("-l", "com.gu.test.HealthCheck"),
  testOptions in HealthCheckTest += Tests.Argument("-n", "com.gu.test.HealthCheck")
)

def all(theProject: Project) = theProject.settings(scalaSettings, testSettings).configs(EffectsTest, HealthCheckTest)

// ==== START libraries ====

lazy val test = all(project in file("lib/test"))
  .settings(
    libraryDependencies ++= Seq(
      scalatest,
      playJson % "test"
    )
  )

val testDep = test % "test->test"

lazy val zuora = all(project in file("lib/zuora"))
  .dependsOn(
    restHttp,
    testDep,
    handler,// TODO only for the config, which needs to be split out
    effects % "test->test"
  )
  .settings(
    libraryDependencies ++= Seq(okhttp3, playJson, scalatest, jacksonDatabind) ++ logging
  )

lazy val `salesforce-core` = all(project in file("lib/salesforce/core"))
  .dependsOn(`config-core`)
  .settings(
    libraryDependencies ++= Seq(playJson) ++ logging
  )

lazy val `salesforce-client` = all(project in file("lib/salesforce/client"))
  .dependsOn(
    restHttp,
    handler,// % "test->test" TODO make this dep only in test - SF client shouldn't depends on ApiGateway
    effects % "test->test",
    testDep,
    `salesforce-core`
  )
  .settings(
    libraryDependencies ++= Seq(okhttp3, catsCore, playJson, scalatest) ++ logging
  )

lazy val `salesforce-sttp-client` = all(project in file("lib/salesforce/sttp-client"))
  .dependsOn(
    `salesforce-core`,
    `salesforce-sttp-test-stub` % Test
  )
  .settings(
    libraryDependencies ++=
      Seq(sttp, sttpCirce, sttpCats % Test, scalatest, catsCore, catsEffect, circe) ++ logging
  )

lazy val `salesforce-sttp-test-stub` = all(project in file("lib/salesforce/sttp-test-stub"))
  .dependsOn(
    `salesforce-core`
  )
  .settings(
    libraryDependencies ++= Seq(sttp, sttpCirce, scalatest) ++ logging
  )

lazy val `holiday-stops` = all(project in file("lib/holiday-stops"))
  .dependsOn(
    `salesforce-client`,
    effects % "test->test",
    testDep,
    `zuora-core` % "compile->compile;test->test"
  )
  .settings(
    libraryDependencies ++= Seq(
      okhttp3,
      playJson,
      scalatest,
      scalaCheck,
      playJsonExtensions,
      circe,
      circeParser,
      sttp,
      sttpCirce,
      mouse,
      enumeratum,
      zio
    ) ++ logging
  )

lazy val restHttp = all(project in file("lib/restHttp"))
  .dependsOn(handler)
  .settings(
    libraryDependencies ++= Seq(okhttp3, catsCore, playJson, scalatest) ++ logging
  )

lazy val s3ConfigValidator = all(project in file("lib/s3ConfigValidator"))
  .dependsOn(
    testDep,
    handler,
    zuora,
    `digital-subscription-expiry`,
    `identity-backfill`,
    effectsDepIncludingTestFolder,
    `cancellation-sf-cases-api`,
    `sf-gocardless-sync`,
    `holiday-stop-api`
  )
  .settings(
    libraryDependencies ++= Seq(scalatest)
  )

lazy val handler = all(project in file("lib/handler"))
  .dependsOn(`effects-s3`, `config-core`)
  .settings(
    libraryDependencies ++= Seq(okhttp3, catsCore, playJson, scalatest, awsLambda) ++ logging
  )

// to aid testability, only the actual handlers called as a lambda can depend on this
lazy val effects = all(project in file("lib/effects"))
  .dependsOn(handler)
  .settings(
    libraryDependencies ++= Seq(okhttp3, playJson, scalatest, awsS3, jacksonDatabind) ++ logging
  )
lazy val `effects-s3` = all(project in file("lib/effects-s3"))
  .settings(
    libraryDependencies ++= Seq(awsS3) ++ logging
  )
lazy val `effects-sqs` = all(project in file("lib/effects-sqs"))
  .dependsOn(testDep)
  .settings(
    libraryDependencies ++= Seq(awsSQS) ++ logging
  )
lazy val `effects-lambda` = all(project in file("lib/effects-lambda"))
  .dependsOn(testDep)
  .settings(
    libraryDependencies ++= Seq(awsSdkLambda) ++ logging
  )

lazy val `effects-ses` = all(project in file("lib/effects-ses"))
  .dependsOn(testDep)
  .settings(
    libraryDependencies ++= Seq(awsSES) ++ logging
  )

lazy val `config-core` = all(project in file("lib/config-core"))

lazy val `config-cats` = all(project in file("lib/config-cats"))
  .settings(
    libraryDependencies ++= Seq(simpleConfig, catsEffect, circe, circeConfig)
  )

val effectsDepIncludingTestFolder: ClasspathDependency = effects % "compile->compile;test->test"

lazy val `zuora-reports` = all(project in file("lib/zuora-reports"))
  .dependsOn(zuora, handler, effectsDepIncludingTestFolder, testDep)

lazy val `fulfilment-dates` = all(project in file("lib/fulfilment-dates"))
  .dependsOn(`effects-s3`, `config-core`, testDep, `zuora-core`)
  .settings(
    libraryDependencies ++= Seq(catsCore, circe, circeParser)
  )

lazy val `zuora-core` = all(project in file("lib/zuora-core"))
  .settings(
    libraryDependencies ++= Seq(
      playJson,
      playJsonExtensions,
      catsCore,
      circe,
      circeParser,
      sttp,
      sttpCirce,
      scalatest,
      diffx,
      mouse
    ) ++ logging
  )

lazy val `credit-processor` = all(project in file("lib/credit-processor"))
  .dependsOn(
    `zuora-core`,
    `fulfilment-dates`
  ).settings(
    libraryDependencies ++= logging
  )

lazy val `imovo-sttp-client` = all(project in file("lib/imovo/imovo-sttp-client"))
  .settings(
    libraryDependencies ++=
      Seq(sttp, sttpCirce, sttpCats % Test, scalatest, catsCore, catsEffect, circe) ++ logging
  )

lazy val `imovo-sttp-test-stub` = all(project in file("lib/imovo/imovo-sttp-test-stub"))
  .dependsOn(`imovo-sttp-client`)
  .settings(
    libraryDependencies ++= Seq(scalatest)
  )

lazy val `zuora-callout-apis` = all(project in file("handlers/zuora-callout-apis"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(zuora, handler, effectsDepIncludingTestFolder, `effects-sqs`, testDep)

lazy val `identity-backfill` = all(project in file("handlers/identity-backfill")) // when using the "project identity-backfill" command it uses the lazy val name
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(
    zuora,
    `salesforce-client` % "compile->compile;test->test",
    handler,
    effectsDepIncludingTestFolder,
    testDep
  )

lazy val `digital-subscription-expiry` = all(project in file("handlers/digital-subscription-expiry"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(zuora, handler, effectsDepIncludingTestFolder, testDep)

lazy val `catalog-service` = all(project in file("handlers/catalog-service"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(zuora, handler, effectsDepIncludingTestFolder, testDep)

lazy val `identity-retention` = all(project in file("handlers/identity-retention"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(zuora, handler, effectsDepIncludingTestFolder, testDep)

lazy val `new-product-api` = all(project in file("handlers/new-product-api"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(zuora, handler, `effects-sqs`, effectsDepIncludingTestFolder, testDep)

lazy val `zuora-retention` = all(project in file("handlers/zuora-retention"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(`zuora-reports`, handler, effectsDepIncludingTestFolder, testDep)

lazy val `zuora-sar` = all(project in file("handlers/zuora-sar"))
  .settings(libraryDependencies ++= Seq(catsEffect, circeParser, circe, awsStepFunction))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(`zuora-reports`, handler, effectsDepIncludingTestFolder, testDep, `effects-s3`, `effects-lambda`)

lazy val `dev-env-cleaner` = all(project in file("handlers/dev-env-cleaner"))
  .settings(libraryDependencies ++= Seq(catsEffect, circeParser, circe, awsStepFunction))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(`zuora-reports`, handler, effectsDepIncludingTestFolder, testDep, `effects-s3`, `effects-lambda`)

lazy val `sf-contact-merge` = all(project in file("handlers/sf-contact-merge"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(zuora, `salesforce-client` % "compile->compile;test->test", handler, effectsDepIncludingTestFolder, testDep)

lazy val `sf-billing-account-remover` = all(project in file("handlers/sf-billing-account-remover"))
  .enablePlugins(RiffRaffArtifact)

lazy val `cancellation-sf-cases-api` = lambdaProject(
    "cancellation-sf-cases-api",
    "Create/update SalesForce cases for self service cancellation tracking",
    "MemSub::Membership::Lambdas::Cancellation SF Cases API",
    Seq(playJsonExtensions)
  ).dependsOn(`salesforce-client`, handler, effectsDepIncludingTestFolder, testDep)

lazy val `sf-gocardless-sync` = all(project in file("handlers/sf-gocardless-sync"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(`salesforce-client`, handler, effectsDepIncludingTestFolder, testDep)

lazy val `holiday-stop-api` = all(project in file("handlers/holiday-stop-api"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(
    `holiday-stops` % "compile->compile;test->test", handler, effectsDepIncludingTestFolder, testDep, `fulfilment-dates`
  )

lazy val `sf-datalake-export` = all(project in file("handlers/sf-datalake-export"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(`salesforce-client`, handler, effectsDepIncludingTestFolder, testDep)

def lambdaProject(
  projectName: String,
  projectDescription: String,
  riffRaffProjectName: String,
  dependencies: Seq[ModuleID] = Nil,
): Project =
  Project(projectName, file(s"handlers/$projectName"))
    .enablePlugins(RiffRaffArtifact)
    .configs(EffectsTest, HealthCheckTest)
    .settings(scalaSettings, testSettings)
    .settings(
      name := projectName,
      description:= projectDescription,
      assemblyJarName := s"$projectName.jar",
      assemblyMergeStrategyDiscardModuleInfo,
      riffRaffPackageType := assembly.value,
      riffRaffUploadArtifactBucket := Option("riffraff-artifact"),
      riffRaffUploadManifestBucket := Option("riffraff-builds"),
      riffRaffManifestProjectName := riffRaffProjectName,
      riffRaffArtifactResources += (file(s"handlers/$projectName/cfn.yaml"), "cfn/cfn.yaml"),
      libraryDependencies ++= dependencies ++ logging
    )

lazy val `zuora-datalake-export` = lambdaProject(
  "zuora-datalake-export",
  "Zuora to Datalake export using Stateful AQuA API which exports incremental changes",
  "MemSub::Membership Admin::Zuora Data Lake Export",
  Seq(scalaLambda, scalajHttp, awsS3, enumeratum)
)

lazy val `batch-email-sender` = lambdaProject(
  "batch-email-sender",
  "Receive batches of emails to be sent, munge them into an appropriate format and put them on the email sending queue.",
  "MemSub::Membership Admin::Batch Email Sender",
  Seq(playJsonExtensions, supportInternationalisation, diffx)
).dependsOn(handler, `effects-sqs`, effectsDepIncludingTestFolder, testDep)

lazy val `braze-to-salesforce-file-upload` = lambdaProject(
  "braze-to-salesforce-file-upload",
  "MemSub::Membership Admin::braze-to-salesforce-file-upload",
  "Braze to Salesforce file upload",
  Seq(
    scalaLambda,
    scalajHttp,
    awsS3,
    betterFiles,
  )
)

lazy val `holiday-stop-processor` = lambdaProject(
  "holiday-stop-processor",
  "Add a holiday credit amendment to a subscription.",
  s"MemSub::Membership Admin::holiday-stop-processor",
  Seq(scalaLambda, awsS3)
).dependsOn(
  `credit-processor`,
  `holiday-stops` % "compile->compile;test->test",
  effects
)

lazy val `delivery-problem-credit-processor` = lambdaProject(
  "delivery-problem-credit-processor",
  "Applies a credit amendment to a subscription for a delivery problem.",
  s"MemSub::Membership Admin::delivery-problem-credit-processor",
  Seq(
    scalaLambda,
    circe,
    zio,
    sttpAsyncHttpClientBackendCats,
    scalatest,
    diffx
  )
).dependsOn(`credit-processor`, `salesforce-sttp-client`, effects)

lazy val `metric-push-api` = lambdaProject(
  "metric-push-api",
  "HTTP API to push a metric to cloudwatch so we can alarm on errors",
  "MemSub::Membership Admin::Metric Push API"
)

lazy val `sf-move-subscriptions-api` = lambdaProject(
  "sf-move-subscriptions-api",
  "API for for moving subscriptions in ZUORA from SalesForce",
  "MemSub::Membership Admin::sf-move-subscriptions-api",
  Seq(
    http4sDsl,
    http4sCirce,
    http4sServer,
    sttp,
    sttpCirce,
    sttpAsyncHttpClientBackendCats,
    scalatest,
    diffx
  )
).dependsOn(`effects-s3`, `config-cats`, `zuora-core`, `http4s-lambda-handler`)

lazy val `fulfilment-date-calculator` = lambdaProject(
  "fulfilment-date-calculator",
  "Generate files in S3 bucket containing relevant fulfilment-related dates, for example, acquisitionsStartDate, holidayStopFirstAvailableDate, etc.",
  "MemSub::Membership Admin::fulfilment-date-calculator",
  Seq(scalaLambda, scalajHttp, enumeratum)
).dependsOn(testDep, `fulfilment-dates`)

lazy val `delivery-records-api` = lambdaProject(
  "delivery-records-api",
  "API for accessing delivery records in Salesforce",
  "MemSub::Subscriptions::Lambdas::Delivery Record API",
  Seq(http4sDsl, http4sCirce, http4sServer, circe, sttpAsyncHttpClientBackendCats, scalatest)
).dependsOn(
  `effects-s3`,
  `config-core`,
  `salesforce-sttp-client`,
  `salesforce-sttp-test-stub` % Test,
  `http4s-lambda-handler`
)

lazy val `digital-voucher-api` = lambdaProject(
  "digital-voucher-api",
  "API for integrating Imovos digital voucher services",
  "MemSub::Subscriptions::Lambdas::Digital Voucher API",
  Seq(
    http4sDsl,
    http4sCirce,
    http4sServer,
    sttpAsyncHttpClientBackendCats,
    scalatest,
    diffx,
    scalaMock,
  )
).dependsOn(`effects-s3`, `config-cats`, `imovo-sttp-client`, `imovo-sttp-test-stub` % Test, `http4s-lambda-handler`)

// FIXME: riffRaffArtifactResources += (file(s"handlers/${name.value}/cdk-cfn.yaml"), "cfn/cdk-cfn.yaml")
lazy val `digital-voucher-cancellation-processor` = lambdaProject(
  "digital-voucher-cancellation-processor",
  "Processor that co-ordinates the cancellation of digital voucher redemption via the imovo api",
  "MemSub::Membership Admin::digital-voucher-cancellation-processor",
  Seq(
    scalatest,
    diffx,
    sttpCats
  )
).dependsOn(
  `config-cats`,
  `salesforce-sttp-client`,
  `salesforce-sttp-test-stub` % Test,
  `imovo-sttp-client`,
  `imovo-sttp-test-stub` % Test
)


lazy val `digital-voucher-suspension-processor` =
  all(project in file("handlers/digital-voucher-suspension-processor"))
  .dependsOn(
    `salesforce-sttp-client`,
    `imovo-sttp-client`
  )
  .settings(
    libraryDependencies ++=
      Seq(
        awsLambda,
        sttpAsyncHttpClientBackendCats,
        sttpOkhttpBackend,
        scalatest,
        scalaMock
      )
        ++ logging
  )
  .enablePlugins(RiffRaffArtifact)

lazy val `contact-us-api` = all(project in file("handlers/contact-us-api"))
  .dependsOn(handler)
  .settings(
    libraryDependencies ++=
      Seq(
        circe,
        circeParser,
        scalatest,
        scalajHttp,
        awsEvents
      )
      ++ logging
  )
  .enablePlugins(RiffRaffArtifact)


lazy val `http4s-lambda-handler` = all(project in file("lib/http4s-lambda-handler"))
  .settings(
    libraryDependencies ++= Seq(circe, circeParser, http4sCore, http4sDsl % Test, scalatest) ++ logging
  )


// ==== END handlers ====

initialize := {
  val _ = initialize.value
  assert(List("1.8", "11").contains(sys.props("java.specification.version")),
    "Java 8 or 11 is required for this project.")
}

lazy val deployAwsLambda = inputKey[Unit]("Directly update AWS lambda code from DEV instead of via RiffRaff for faster feedback loop")
deployAwsLambda := {
  import scala.sys.process._
  import complete.DefaultParsers._
  val Seq(name, stage) = spaceDelimited("<arg>").parsed
  s"aws lambda update-function-code --function-name $name-$stage --zip-file fileb://handlers/$name/target/scala-2.13/$name.jar --profile membership --region eu-west-1".!
}

// run from root project: deploy holiday-stop-processor CODE
commands += Command.args("deploy", "<name stage>") { (state, args) =>
  val Seq(name, stage) = args
  s"""$name/assembly""":: s"deployAwsLambda $name $stage" :: state
}
