import Dependencies.*

val scala2Settings = Seq(
  ThisBuild / scalaVersion := "2.13.12",
  version := "0.0.1",
  organization := "com.gu",
  scalacOptions ++= Seq(
    "-deprecation",
    "-encoding",
    "UTF-8",
    "-feature",
    "-target:jvm-1.8",
    "-language:existentials",
    "-language:higherKinds",
    "-language:implicitConversions",
    "-unchecked",
    "-Xlint",
    "-Xlint:-byname-implicit",
    "-Ywarn-dead-code",
    "-Ywarn-numeric-widen",
    "-Ywarn-value-discard",
    "-Ytasty-reader",
  ),
  Test / fork := true,
  autoCompilerPlugins := true,
)

val scala3Settings = Seq(
  scalaVersion := "3.3.1",
  version := "0.0.1",
  organization := "com.gu",
  scalacOptions ++= Seq(
    "-deprecation",
    "-encoding",
    "UTF-8",
    "-feature",
    "-unchecked",
    "-Xmax-inlines",
    "256",
    "-Yretain-trees",
  ),
  Test / fork := true,
  autoCompilerPlugins := true,
)

lazy val scalafmtSettings = Seq(
  scalafmtFilter.withRank(KeyRanks.Invisible) := "diff-dirty",
  (Test / test) := ((Test / test) dependsOn (Test / scalafmtCheckAll)).value,
  (Test / testOnly) := ((Test / testOnly) dependsOn (Test / scalafmtCheckAll)).evaluated,
  (Test / testQuick) := ((Test / testQuick) dependsOn (Test / scalafmtCheckAll)).evaluated,
)

// fixme this whole file needs splitting down appropriately

lazy val EffectsTest = config("effectsTest") extend Test describedAs "run the edge tests"
lazy val HealthCheckTest = config("healthCheck") extend Test describedAs "run the health checks against prod/code"
val testSettings = inConfig(EffectsTest)(Defaults.testTasks) ++ inConfig(HealthCheckTest)(Defaults.testTasks) ++ Seq(
  Test / testOptions += Tests.Argument("-l", "com.gu.test.EffectsTest"),
  Test / testOptions += Tests.Argument("-l", "com.gu.test.HealthCheck"),
  EffectsTest / testOptions -= Tests.Argument("-l", "com.gu.test.EffectsTest"),
  EffectsTest / testOptions -= Tests.Argument("-l", "com.gu.test.HealthCheck"),
  EffectsTest / testOptions += Tests.Argument("-n", "com.gu.test.EffectsTest"),
  HealthCheckTest / testOptions -= Tests.Argument("-l", "com.gu.test.EffectsTest"),
  HealthCheckTest / testOptions -= Tests.Argument("-l", "com.gu.test.HealthCheck"),
  HealthCheckTest / testOptions += Tests.Argument("-n", "com.gu.test.HealthCheck"),
)

def library(
    theProject: Project,
    projectDependencies: Seq[ClasspathDependency] = Seq(),
    scalaSettings: SettingsDefinition = scala2Settings,
) =
  theProject
    .settings(scalaSettings, testSettings, scalafmtSettings)
    .configs(EffectsTest, HealthCheckTest)
    .dependsOn(projectDependencies *)
    .settings(
      Test / test := ((Test / test) dependsOn (projectDependencies.map(cp => cp.project / Test / test) *)).value,
      Test / testOnly := ((Test / testOnly) dependsOn (projectDependencies.map(_.project / Test / test) *)).evaluated,
      Test / testQuick := ((Test / testQuick) dependsOn (projectDependencies.map(_.project / Test / test) *)).evaluated,
    )

// ==== START libraries ====

lazy val testLib = library(project in file("lib/test"))
  .settings(
    libraryDependencies ++= Seq(
      scalatest,
      playJson % "test",
    ),
  )

val testDep = testLib % "test->test"

lazy val zuora = library(
  project in file("lib/zuora"),
  Seq(
    restHttp,
    testDep,
    handler, // TODO only for the config, which needs to be split out
    effects % "test->test",
  ),
)
  .settings(
    libraryDependencies ++= Seq(okhttp3, playJson, scalatest) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `salesforce-core` = library(
  project in file("lib/salesforce/core"),
  Seq(`config-core`)
)
  .settings(
    libraryDependencies ++= Seq(playJson),
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `salesforce-client` = library(
  project in file("lib/salesforce/client"),
  Seq(
    restHttp,
    handler, // % "test->test" TODO make this dep only in test - SF client shouldn't depends on ApiGateway
    effects % "test->test",
    testDep,
    `salesforce-core`,
  ),
)
  .settings(
    libraryDependencies ++= Seq(okhttp3, catsCore, playJson, scalatest) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `salesforce-sttp-client` = library(
  project in file("lib/salesforce/sttp-client"),
  Seq(
    `salesforce-core`,
    `salesforce-sttp-test-stub` % Test,
  ),
)
  .settings(
    libraryDependencies ++=
      Seq(sttp, sttpCirce, sttpAsyncHttpClientBackendCats % Test, scalatest, catsCore, catsEffect, circe) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `salesforce-sttp-test-stub` = library(
  project in file("lib/salesforce/sttp-test-stub"),
  Seq(
    `salesforce-core`,
  ),
)
  .settings(
    libraryDependencies ++= Seq(sttp, sttpCirce, scalatest) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `holiday-stops` = library(
  project in file("lib/holiday-stops"),
  Seq(
    `salesforce-client`,
    effects % "test->test",
    testDep,
    `zuora-core` % "compile->compile;test->test",
  ),
)
  .settings(
    libraryDependencies ++= Seq(
      okhttp3,
      playJson,
      scalatest,
      scalaCheck,
      circe,
      circeParser,
      sttp,
      sttpCirce,
      enumeratum,
      zio,
    ) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val restHttp = library(project in file("lib/restHttp"), Seq(handler))
  .settings(
    libraryDependencies ++= Seq(okhttp3, catsCore, playJson, scalatest) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val s3ConfigValidator = library(
  project in file("lib/s3ConfigValidator"),
  Seq(
    testDep,
    handler,
    zuora,
    `digital-subscription-expiry`,
    `identity-backfill`,
    effectsDepIncludingTestFolder,
    `cancellation-sf-cases-api`,
    `sf-gocardless-sync`,
    `holiday-stop-api`,
  ),
)
  .settings(
    libraryDependencies ++= Seq(scalatest),
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val handler = library(
  project in file("lib/handler"),
  Seq(`effects-s3`, `config-core`),
)
  .settings(
    libraryDependencies ++= Seq(okhttp3, catsCore, playJson, scalatest, awsLambda) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )

// to aid testability, only the actual handlers called as a lambda can depend on this
lazy val effects = library(
  project in file("lib/effects"),
  Seq(handler),
)
  .settings(
    dependencyOverrides ++= jacksonDependencies,
    libraryDependencies ++= Seq(okhttp3, playJson, scalatest, awsS3) ++ logging,
  )
lazy val `effects-s3` = library(project in file("lib/effects-s3"))
  .settings(
    libraryDependencies ++= Seq(awsS3) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )
lazy val `effects-cloudwatch` = library(
  project in file("lib/effects-cloudwatch"),
  Seq(testDep),
)
  .settings(
    libraryDependencies ++= Seq(awsCloudwatch) ++ logging,
  )
lazy val `effects-sqs` = library(project in file("lib/effects-sqs"), Seq(testDep))
  .settings(
    libraryDependencies ++= Seq(awsSQS) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )
lazy val `effects-lambda` = library(project in file("lib/effects-lambda"), Seq(testDep))
  .settings(
    libraryDependencies ++= Seq(awsSdkLambda) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `config-core` = library(project in file("lib/config-core"), Seq(), scala3Settings)

lazy val `config-cats` = library(project in file("lib/config-cats"))
  .settings(
    libraryDependencies ++= Seq(simpleConfig, catsEffect, circe, circeConfig),
    dependencyOverrides ++= Seq(nettyCodec) ++ jacksonDependencies,
  )

val effectsDepIncludingTestFolder: ClasspathDependency = effects % "compile->compile;test->test"

lazy val `zuora-reports` = library(
  project in file("lib/zuora-reports"),
  Seq(zuora, handler, effectsDepIncludingTestFolder, testDep)
)
  .settings(dependencyOverrides ++= jacksonDependencies)

lazy val `fulfilment-dates` = library(
  project in file("lib/fulfilment-dates"),
  Seq(`effects-s3`, `config-core`, testDep, `zuora-core`)
)
  .settings(
    libraryDependencies ++= Seq(catsCore, circe, circeParser),
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `google-bigquery` = library(
    project in file("lib/google-bigquery"),
  Seq(testDep, `config-core`, `effects-s3` % "test", handler % "test")
)
  .settings(
    libraryDependencies ++= Seq(googleBigQuery, playJson) ++ logging,
  )

lazy val `zuora-baton` = library(
  project in file("lib/zuora-baton"),
  Seq(zuora, `config-core`)
)
  .settings(
    libraryDependencies ++= Seq(playJson),
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `zuora-core` = library(project in file("lib/zuora-core"))
  .settings(
    libraryDependencies ++= Seq(
      playJson,
      catsCore,
      circe,
      circeParser,
      sttp,
      sttpCirce,
      scalatest,
      diffx,
    ) ++ logging,
    dependencyOverrides ++= jacksonDependencies,
  )

// this lib is shared between ZIO and non zio projects so can't depend on json libs, http clients, effects etc.
lazy val `zuora-models` = library(
  project in file("lib/zuora-models"),
  Seq(`config-core`),
  scala3Settings
)
  .settings(
    libraryDependencies += "com.gu" %% "support-internationalisation" % "0.16" exclude ("com.typesafe.scala-logging", "scala-logging_2.13"),
  )

lazy val `credit-processor` = library(
  project in file("lib/credit-processor"),
  Seq(
    `zuora-core`,
    `fulfilment-dates`,
  ),
)
  .settings(
    libraryDependencies ++= logging,
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `imovo-sttp-client` = library(project in file("lib/imovo/imovo-sttp-client"))
  .settings(
    libraryDependencies ++=
      Seq(sttp, sttpCirce, sttpAsyncHttpClientBackendCats % Test, scalatest, catsCore, catsEffect, circe) ++ logging,
  )

lazy val `imovo-sttp-test-stub` = library(
  project in file("lib/imovo/imovo-sttp-test-stub"),
  Seq(`imovo-sttp-client`)
)
  .settings(
    libraryDependencies ++= Seq(scalatest),
  )

def lambdaProject(
    projectName: String,
    projectDescription: String,
    externalDependencies: Seq[sbt.ModuleID] = Nil,
    projectDependencies: Seq[ClasspathDependency] = Nil,
    scalaSettings: SettingsDefinition = scala2Settings,
) = {
  val cfName = "cfn.yaml"
  Project(projectName, file(s"handlers/$projectName"))
    .enablePlugins(RiffRaffArtifact)
    .configs(EffectsTest, HealthCheckTest)
    .dependsOn(projectDependencies *)
    .settings(scalaSettings, testSettings, scalafmtSettings)
    .settings(
      name := projectName,
      description := projectDescription,
      assemblyJarName := s"$projectName.jar",
      assemblyMergeStrategyDiscardModuleInfo,
      riffRaffAwsRegion := "eu-west-1",
      riffRaffPackageType := assembly.value,
      riffRaffUploadArtifactBucket := Option("riffraff-artifact"),
      riffRaffUploadManifestBucket := Option("riffraff-builds"),
      riffRaffManifestProjectName := s"support-service-lambdas::$projectName",
      riffRaffArtifactResources += (file(s"handlers/$projectName/$cfName"), s"cfn/$cfName"),
      dependencyOverrides ++= jacksonDependencies,
      libraryDependencies ++= externalDependencies ++ logging,
      Test / test := ((Test / test) dependsOn (projectDependencies.map(_.project / Test / test) *)).value,
      Test / testOnly := ((Test / testOnly) dependsOn (projectDependencies.map(_.project / Test / test) *)).evaluated,
      Test / testQuick := ((Test / testQuick) dependsOn (projectDependencies.map(_.project / Test / test) *)).evaluated,
    )
}

lazy val `zuora-callout-apis` = lambdaProject(
  "zuora-callout-apis",
  "Handles auto-cancellations for membership and subscriptions",
  Seq(
    awsLambda,
    okhttp3,
    scalatest,
    stripe,
    scalaMock,
  ),
  Seq(zuora, handler, effectsDepIncludingTestFolder, `effects-sqs`, testDep),
)

lazy val `identity-backfill` = lambdaProject(
  "identity-backfill",
  "links subscriptions with identity accounts",
  Seq(supportInternationalisation),
  Seq(
    zuora,
    `salesforce-client` % "compile->compile;test->test",
    handler,
    effectsDepIncludingTestFolder,
    testDep,
  ),
)

lazy val `digital-subscription-expiry` = lambdaProject(
  "digital-subscription-expiry",
  "check digital subscription expiration for authorisation purposes",
  Seq(contentAuthCommon),
  Seq(zuora, handler, effectsDepIncludingTestFolder, testDep),
)

lazy val `catalog-service` = lambdaProject(
  "catalog-service",
  "Download the Zuora Catalog and store the JSON in S3",
  Seq(),
  Seq(zuora, handler, effectsDepIncludingTestFolder, testDep),
)
  .settings(
    dependencyOverrides ++= jacksonDependencies,
  )

lazy val `identity-retention` = lambdaProject(
  "identity-retention",
  "Confirms whether an identity account can be deleted, from a reader revenue perspective",
  Seq(),
  Seq(zuora, handler, effectsDepIncludingTestFolder, `google-bigquery`, testDep),
)
  .settings(
    assemblyMergeStrategy := {
      case "arrow-git.properties" => MergeStrategy.discard
      case "META-INF/kotlin-stdlib.kotlin_module" => MergeStrategy.discard
      case "META-INF/kotlin-stdlib-common.kotlin_module" => MergeStrategy.discard
      case x =>
        val oldStrategy = assemblyMergeStrategy.value
        oldStrategy(x)
    },
  )

lazy val `new-product-api` = lambdaProject(
  "new-product-api",
  "Add subscription to account",
  Seq(diffx),
  Seq(zuora, handler, `effects-sqs`, effectsDepIncludingTestFolder, testDep, `zuora-models`, `config-core`),
)
  .settings(
    Test / unmanagedResourceDirectories += (Test / scalaSource).value,
    Test / unmanagedResources / excludeFilter := "*.scala",
  )

lazy val `single-contribution-salesforce-writes` = lambdaProject(
  "single-contribution-salesforce-writes",
  "Create a single contribution record in Salesforce",
  Seq(circe, circeParser, awsEvents, scalajHttp, awsSecretsManager),
  Seq(handler, testDep),
)

lazy val `zuora-retention` = lambdaProject(
  "zuora-retention",
  "find and mark accounts that are out of the retention period",
  Seq(),
  Seq(`zuora-reports`, handler, effectsDepIncludingTestFolder, testDep),
)

lazy val `zuora-rer` = lambdaProject(
  "zuora-rer",
  "Performs Right to Erasure Requests against Zuora",
  Seq(catsEffect, circeParser, circe),
  Seq(
    `zuora-reports`,
    `zuora-baton`,
    handler,
    effectsDepIncludingTestFolder,
    testDep,
    `effects-s3`,
    `effects-lambda`,
  ),
)
  .settings(Test / unmanagedSourceDirectories += baseDirectory.value / "src/local")

lazy val `zuora-sar` = lambdaProject(
  "zuora-sar",
  "Performs a Subject Access Requests against Zuora",
  Seq(catsEffect, circeParser, circe),
  Seq(
    `zuora-reports`,
    `zuora-baton`,
    handler,
    effectsDepIncludingTestFolder,
    testDep,
    `effects-s3`,
    `effects-lambda`,
  ),
)

lazy val `dev-env-cleaner` = lambdaProject(
  "dev-env-cleaner",
  "Cleans up the salesforce to free up storage via 360 sync/zuora",
  Seq(),
  Seq(`zuora-reports`, handler, effectsDepIncludingTestFolder, testDep, `effects-s3`, `effects-cloudwatch`),
)

lazy val `revenue-recogniser-job` = lambdaProject(
  "revenue-recogniser-job",
  "Finds unrecognised revenue in zuora and recognises it appropariately",
  Seq(
    "com.nrinaudo" %% "kantan.csv-generic" % "0.7.0",
    "com.nrinaudo" %% "kantan.csv-java8" % "0.7.0",
  ),
  Seq(`zuora-reports`, handler, effectsDepIncludingTestFolder, testDep, `effects-s3`, `effects-cloudwatch`),
)

lazy val `sf-contact-merge` = lambdaProject(
  "sf-contact-merge",
  "Merges together the salesforce account referenced by a set of zuora accounts",
  Seq(),
  Seq(zuora, `salesforce-client` % "compile->compile;test->test", handler, effectsDepIncludingTestFolder, testDep),
)

lazy val `sf-billing-account-remover` = lambdaProject(
  "sf-billing-account-remover",
  "Removes Billing Accounts and related records from Salesforce",
  Seq(circe, circeParser, scalajHttp, awsSecretsManager, upickle),
)

lazy val `soft-opt-in-consent-setter` = lambdaProject(
  "soft-opt-in-consent-setter",
  "sets or unsets soft opt in consents dependent on subscription product",
  Seq(
    awsSecretsManager,
    circe,
    circeParser,
    scalatest,
    scalajHttp,
    awsS3,
    awsDynamo,
    simpleConfig,
    awsLambda,
    awsSQS,
    awsEvents,
    scalaMock,
    awsSecretsManager,
    upickle,
  ) ++ logging,
  Seq(`effects-s3`, `effects-cloudwatch`, `salesforce-core`),
)

lazy val `sf-emails-to-s3-exporter` = lambdaProject(
  "sf-emails-to-s3-exporter",
  "Runs regularly to retrieve emails from Salesforce and save as json in S3",
  Seq(circe, circeParser, scalajHttp, awsS3, awsSecretsManager, upickle),
  Seq(`effects-s3`, `effects-cloudwatch`),
)

lazy val `sf-api-user-credentials-setter` = lambdaProject(
  "sf-api-user-credentials-setter",
  "Set passwords for Aws API Users in SF, and then create or update an entry for the credentials in AWS secrets manager",
  Seq(awsSecretsManager, circe, circeParser, scalajHttp, awsS3, upickle),
)

lazy val `cancellation-sf-cases-api` = lambdaProject(
  "cancellation-sf-cases-api",
  "Create/update SalesForce cases for self service cancellation tracking",
  Seq(),
  Seq(`salesforce-client`, handler, effectsDepIncludingTestFolder, testDep),
)

lazy val `sf-gocardless-sync` = lambdaProject(
  "sf-gocardless-sync",
  "Polls GoCardless for direct debit mandate events and pushes into SalesForce",
  Seq(),
  Seq(`salesforce-client`, handler, effectsDepIncludingTestFolder, testDep),
)

lazy val `holiday-stop-api` = lambdaProject(
  "holiday-stop-api",
  "CRUD API for Holiday Stop Requests stored in SalesForce",
  Seq(awsSecretsManager, upickle),
  Seq(
    `holiday-stops` % "compile->compile;test->test",
    handler,
    effectsDepIncludingTestFolder,
    testDep,
    `fulfilment-dates`,
  ),
)

lazy val `sf-datalake-export` = lambdaProject(
  "sf-datalake-export",
  "Export salesforce data to the data lake",
  Seq(scalaXml),
  Seq(`salesforce-client`, handler, effectsDepIncludingTestFolder, testDep),
)

lazy val `zuora-datalake-export` = lambdaProject(
  "zuora-datalake-export",
  "Zuora to Datalake export using Stateful AQuA API which exports incremental changes",
  Seq(scalaLambda, scalajHttp, awsS3, enumeratum),
)

lazy val `batch-email-sender` = lambdaProject(
  "batch-email-sender",
  "Receive batches of emails to be sent, munge them into an appropriate format and put them on the email sending queue.",
  Seq(supportInternationalisation, diffx, parallelCollections, mockito),
  Seq(handler, `effects-sqs`, effectsDepIncludingTestFolder, testDep),
)

lazy val `holiday-stop-processor` = lambdaProject(
  "holiday-stop-processor",
  "Add a holiday credit amendment to a subscription.",
  Seq(scalaLambda, awsS3),
  Seq(
    `credit-processor`,
    `holiday-stops` % "compile->compile;test->test",
    effects,
  ),
)

lazy val `delivery-problem-credit-processor` = lambdaProject(
  "delivery-problem-credit-processor",
  "Applies a credit amendment to a subscription for a delivery problem.",
  Seq(
    scalaLambda,
    circe,
    zio,
    sttpAsyncHttpClientBackendCats,
    scalatest,
    diffx,
  ),
  Seq(`credit-processor`, `salesforce-sttp-client`, effects),
)

lazy val `product-move-api` = lambdaProject(
  "product-move-api",
  "moves a supporter from one product to another.",
  Seq(
    zio2,
    ("com.gu" %% "support-product-data-dynamo" % "0.6").cross(
      CrossVersion.for3Use2_13,
    ) exclude ("com.typesafe.scala-logging", "scala-logging_2.13"),
    awsEvents,
    awsLambda,
    "com.softwaremill.sttp.client3" %% "zio" % sttpVersion exclude ("org.scala-lang.modules", "scala-collection-compat_2.13"),
    awsS3,
    awsSQS,
    scalatest,
    "com.softwaremill.sttp.client3" %% "zio-json" % sttpVersion,
    "dev.zio" %% "zio-logging-slf4j" % "2.1.13",
    "dev.zio" %% "zio-test" % zio2Version % Test,
    "dev.zio" %% "zio-test-sbt" % zio2Version % Test,
    "com.softwaremill.sttp.tapir" %% "tapir-core" % tapirVersion,
    "com.softwaremill.sttp.tapir" %% "tapir-json-zio" % tapirVersion,
    "com.softwaremill.sttp.tapir" %% "tapir-aws-lambda" % tapirVersion,
    "com.softwaremill.sttp.tapir" %% "tapir-aws-lambda-zio" % tapirVersion,
    "com.softwaremill.sttp.tapir" %% "tapir-swagger-ui-bundle" % tapirVersion,
    awsSecretsManager,
    upickle,
  ),
  Seq(`zuora-models`, `effects-sqs`, `new-product-api`),
  scala3Settings ++ Seq(
    excludeDependencies ++= Seq(
      ExclusionRule("org.typelevel", "cats-kernel_2.13"),
      ExclusionRule("org.typelevel", "cats-core_2.13"),
      ExclusionRule("com.typesafe.scala-logging", "scala-logging_2.13"),
    ),
  ),
)
  .settings {
    testFrameworks += new TestFramework("zio.test.sbt.ZTestFramework")
    genDocs := genDocsImpl("com.gu.productmove.MakeDocsYaml").value

    lazy val deployTo =
      inputKey[Unit](
        "Directly update AWS lambda code from your local machine instead of via RiffRaff for faster feedback loop",
      )

    // run from product-move-api project eg. deployTo CODE
    // product-move-api needs its own deploy task currently because firstly it's Scala 3 so the jar path is different to
    // other projects and secondly the jar is too large to deploy with the aws cli --zip-file parameter so we need to use S3
    deployTo := {
      import scala.sys.process.*
      import complete.DefaultParsers.*
      val jarFile = assembly.value

      val Seq(stage) = spaceDelimited("<arg>").parsed
      val s3Bucket = "support-service-lambdas-dist"
      val s3Path = s"membership/$stage/product-move-api/product-move-api.jar"

      s"aws s3 cp $jarFile s3://$s3Bucket/$s3Path --profile membership --region eu-west-1".!!
      s"aws lambda update-function-code --function-name move-product-$stage --s3-bucket $s3Bucket --s3-key $s3Path --profile membership --region eu-west-1".!!
      s"aws lambda update-function-code --function-name product-switch-refund-$stage --s3-bucket $s3Bucket --s3-key $s3Path --profile membership --region eu-west-1".!!
      s"aws lambda update-function-code --function-name product-switch-salesforce-tracking-$stage --s3-bucket $s3Bucket --s3-key $s3Path --profile membership --region eu-west-1".!!
    }
  }

lazy val `metric-push-api` =
  lambdaProject("metric-push-api", "HTTP API to push a metric to cloudwatch so we can alarm on errors")

lazy val `sf-move-subscriptions-api` = lambdaProject(
  "sf-move-subscriptions-api",
  "API for for moving subscriptions in ZUORA from SalesForce",
  Seq(
    http4sDsl,
    http4sCirce,
    http4sServer,
    sttp,
    sttpCirce,
    sttpAsyncHttpClientBackendCats,
    scalatest,
    diffx,
  ),
  Seq(`effects-s3`, `effects-sqs`, `config-cats`, `zuora-core`, `http4s-lambda-handler`),
)

lazy val `fulfilment-date-calculator` = lambdaProject(
  "fulfilment-date-calculator",
  "Generate files in S3 bucket containing relevant fulfilment-related dates, for example, acquisitionsStartDate, holidayStopFirstAvailableDate, etc.",
  Seq(scalaLambda, scalajHttp, enumeratum),
  Seq(testDep, `fulfilment-dates`),
)

lazy val `delivery-records-api` = lambdaProject(
  "delivery-records-api",
  "API for accessing delivery records in Salesforce",
  Seq(
    http4sDsl,
    http4sCirce,
    http4sServer,
    circe,
    sttpAsyncHttpClientBackendCats,
    scalatest,
    diffx,
  ),
  Seq(
    `effects-s3`,
    `config-core`,
    `salesforce-sttp-client`,
    `salesforce-sttp-test-stub` % Test,
    `http4s-lambda-handler`,
    testDep,
  ),
)

lazy val `digital-voucher-api` = lambdaProject(
  "digital-voucher-api",
  "API for integrating Imovos digital voucher services",
  Seq(
    http4sDsl,
    http4sCirce,
    http4sServer,
    sttpAsyncHttpClientBackendCats,
    scalatest,
    diffx,
    scalaMock,
  ),
  Seq(`effects-s3`, `config-cats`, `imovo-sttp-client`, `imovo-sttp-test-stub` % Test, `http4s-lambda-handler`),
)

lazy val `digital-voucher-cancellation-processor` = lambdaProject(
  "digital-voucher-cancellation-processor",
  "Processor that co-ordinates the cancellation of digital voucher redemption via the imovo api",
  Seq(
    scalatest,
    diffx,
    sttpAsyncHttpClientBackendCats,
  ),
  Seq(
    `config-cats`,
    `salesforce-sttp-client`,
    `salesforce-sttp-test-stub` % Test,
    `imovo-sttp-client`,
    `imovo-sttp-test-stub` % Test,
  ),
).settings(
  dependencyOverrides += nettyCodec,
)

lazy val `digital-voucher-suspension-processor` = lambdaProject(
  "digital-voucher-suspension-processor",
  "Processor that suspends digital vouchers via the digital voucher API.",
  Seq(
    awsLambda,
    sttpAsyncHttpClientBackendCats,
    sttpOkhttpBackend,
    scalatest,
    scalaMock,
    awsSecretsManager,
    upickle,
  ),
  Seq(`salesforce-sttp-client`, `imovo-sttp-client`),
)
  .settings(dependencyOverrides ++= Seq(nettyCodec))

lazy val `contact-us-api` = lambdaProject(
  "contact-us-api",
  "Transforms a request from the Contact Us form into a Salesforce case",
  Seq(
    circe,
    circeParser,
    scalatest,
    scalajHttp,
    awsEvents,
    awsSecretsManager,
    upickle,
  ),
  Seq(handler),
)

lazy val `http4s-lambda-handler` = library(project in file("lib/http4s-lambda-handler"))
  .settings(
    libraryDependencies ++= Seq(circe, circeParser, http4sCore, http4sDsl % Test, scalatest) ++ logging,
  )

lazy val `stripe-webhook-endpoints` = lambdaProject(
  "stripe-webhook-endpoints",
  "Endpoints to handle stripe webhooks",
  Seq(
    circe,
    circeParser,
    scalatest,
    stripe,
    awsEvents,
    sttp,
    sttpCirce,
  ),
  Seq(handler, `config-cats`, zuora, `zuora-core`, effectsDepIncludingTestFolder, testDep),
).settings {
  dependencyOverrides ++= jacksonDependencies
  lazy val deployTo =
    inputKey[Unit](
      "Command to directly update AWS lambda code from your local machine instead of via RiffRaff for faster feedback loop",
    )

  /*
  To run script in sbt shell:
    1. run `project stripe-webhook-endpoints`
    2. run `deployTo CODE`
   */
  deployTo := {
    import scala.sys.process.*
    import complete.DefaultParsers.*
    val jarFile = assembly.value

    val Seq(stage) = spaceDelimited("<arg>").parsed
    val s3Bucket = "support-service-lambdas-dist"
    val s3Path = s"membership/$stage/stripe-webhook-endpoints/stripe-webhook-endpoints.jar"

    s"aws s3 cp $jarFile s3://$s3Bucket/$s3Path --profile membership --region eu-west-1".!
    s"aws lambda update-function-code --function-name stripe-customer-updated-$stage --s3-bucket $s3Bucket --s3-key $s3Path --profile membership --region eu-west-1".!
    s"aws lambda update-function-code --function-name stripe-payment-intent-issues-$stage --s3-bucket $s3Bucket --s3-key $s3Path --profile membership --region eu-west-1".!
  }
}

// ==== END handlers ====

lazy val genDocs = taskKey[Unit]("generate yaml open API docs")

def genDocsImpl(makeDocsClassName: String): Def.Initialize[Task[Unit]] = {
  Def.taskDyn {
    val targetPath = target.value.toString
    Def.task {
      (Compile / runMain).toTask(" " + makeDocsClassName + " " + targetPath + "/APIDocs.yaml").value
    }
  }
}

initialize := {
  val _ = initialize.value
  assert(
    List("1.8", "11").contains(sys.props("java.specification.version")),
    "Java 8 or 11 is required for this project.",
  )
}

lazy val deployAwsLambda =
  inputKey[Unit](
    "Directly update AWS lambda code from your local machine instead of via RiffRaff for faster feedback loop",
  )
deployAwsLambda := {
  import scala.sys.process.*
  import complete.DefaultParsers.*
  val Seq(name, stage) = spaceDelimited("<arg>").parsed
  s"aws lambda update-function-code --function-name $name-$stage --zip-file fileb://handlers/$name/target/scala-2.13/$name.jar --profile membership --region eu-west-1".!
}

// run from root project: deploy holiday-stop-processor CODE
commands += Command.args("deploy", "<name stage>") { (state, args) =>
  val Seq(name, stage) = args
  s"""$name/assembly""" :: s"deployAwsLambda $name $stage" :: state
}
