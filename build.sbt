import Dependencies._

val scalaSettings = Seq(
  scalaVersion := "2.12.6",
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
    "-Yno-adapted-args",
    "-Ywarn-dead-code",
    "-Ywarn-numeric-widen",
    "-Ywarn-value-discard"
  ),
  javaOptions in Test += s"""-Dlog4j.configuration=file:${new File(".").getCanonicalPath}/test_log4j.properties""",
  fork in Test := true,
  {
    import scalariform.formatter.preferences._
    scalariformPreferences := scalariformPreferences.value
      .setPreference(DanglingCloseParenthesis, Force)
      .setPreference(SpacesAroundMultiImports, false)
      .setPreference(NewlineAtEndOfFile, true)
  },libraryDependencies += "com.lihaoyi" %% "acyclic" % "0.1.7" % "provided",

  autoCompilerPlugins := true,

  addCompilerPlugin("com.lihaoyi" %% "acyclic" % "0.1.7"),
  scalacOptions += "-P:acyclic:force"
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
    libraryDependencies ++= Seq(okhttp3, logging, scalaz, playJson, scalatest, jacksonDatabind)
  )

lazy val salesforce = all(project in file("lib/salesforce"))
  .dependsOn(
    restHttp,
    handler,// % "test->test" TODO make this dep only in test - SF client shouldn't depends on ApiGateway
    effects % "test->test",
    testDep
  )
  .settings(
    libraryDependencies ++= Seq(okhttp3, logging, scalaz, playJson, scalatest)
  )

lazy val restHttp = all(project in file("lib/restHttp"))
  .settings(
    libraryDependencies ++= Seq(okhttp3, logging, scalaz, playJson, scalatest)
  )

lazy val s3ConfigValidator = all(project in file("lib/s3ConfigValidator"))
  .dependsOn(
    testDep,
    handler,
    zuora,
    `digital-subscription-expiry`,
    `identity-backfill`,
    effectsDepIncludingTestFolder,
    `cancellation-sf-cases`
  )
  .settings(
    libraryDependencies ++= Seq(scalatest)
  )

lazy val handler = all(project in file("lib/handler"))
  .settings(
    libraryDependencies ++= Seq(okhttp3, logging, scalaz, playJson, scalatest, awsLambda, awsS3)
  )

// to aid testability, only the actual handlers called as a lambda can depend on this
lazy val effects = all(project in file("lib/effects"))
  .dependsOn(handler)
  .settings(
    libraryDependencies ++= Seq(okhttp3, logging, scalaz, playJson, scalatest, awsS3, jacksonDatabind)
  )
lazy val `effects-sqs` = all(project in file("lib/effects-sqs"))
  .dependsOn(testDep)
  .settings(
    libraryDependencies ++= Seq(logging, awsSQS)
  )

lazy val `effects-ses` = all(project in file("lib/effects-ses"))
  .dependsOn(testDep)
  .settings(
    libraryDependencies ++= Seq(logging, awsSES)
  )

val effectsDepIncludingTestFolder: ClasspathDependency = effects % "compile->compile;test->test"

lazy val `zuora-reports` = all(project in file("lib/zuora-reports"))
  .dependsOn(zuora, handler, effectsDepIncludingTestFolder, testDep)


// ==== END libraries ====

// ==== START handlers ====

// currently the original code is lying in the root, in due course we need to make three separate sub projects for these original lambdas
// they should produce their own self contained jar to reduce the artifact size and startup time.  Any shared code can be
// a set of projects that is "dependsOn(..)" by the sharing projects.  Don't be afraid to restructure things to keep the code nice!
lazy val root = all(project in file(".")).enablePlugins(RiffRaffArtifact).aggregate(
  `identity-backfill`,
  `digital-subscription-expiry`,
  `catalog-service`,
  `identity-retention`,
  `zuora-retention`,
  `sf-contact-merge`,
  `cancellation-sf-cases`,
  effects,
  handler,
  restHttp,
  zuora,
  `zuora-reports`,
  salesforce,
  s3ConfigValidator,
  `new-product-api`
).dependsOn(zuora, handler, effectsDepIncludingTestFolder, testDep)

lazy val `identity-backfill` = all(project in file("handlers/identity-backfill")) // when using the "project identity-backfill" command it uses the lazy val name
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(zuora, salesforce, handler, effectsDepIncludingTestFolder, testDep, salesforce % "test->test")

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

lazy val `sf-contact-merge` = all(project in file("handlers/sf-contact-merge"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(zuora, handler, effectsDepIncludingTestFolder, testDep)

lazy val `cancellation-sf-cases` = all(project in file("handlers/cancellation-sf-cases"))
  .enablePlugins(RiffRaffArtifact)
  .dependsOn(salesforce, handler, effectsDepIncludingTestFolder, testDep)


// ==== END handlers ====

initialize := {
  val _ = initialize.value
  assert(sys.props("java.specification.version") == "1.8",
    "Java 8 is required for this project.")
}
