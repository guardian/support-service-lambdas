import sbt._
import sbtassembly.AssemblyKeys.assembly
import sbtassembly.AssemblyPlugin.autoImport.{
  MergeStrategy,
  assemblyMergeStrategy
}
import sbtassembly.PathList

object Dependencies {
  val awsSdkVersion = "2.17.59"
  val circeVersion = "0.13.0"
  val sttpVersion = "3.3.16"
  val http4sVersion = "0.21.31"
  val catsVersion = "2.6.1"
  val catsEffectVersion = "2.5.4"

  val logging = Seq(
    "ch.qos.logback" % "logback-classic" % "1.2.6",
    "com.typesafe.scala-logging" %% "scala-logging" % "3.9.4"
  )

  // AWS
  val awsCloudwatch = "software.amazon.awssdk" % "cloudwatch" % awsSdkVersion
  val awsSdkLambda = "software.amazon.awssdk" % "lambda" % awsSdkVersion
  val awsSecretsManager = "software.amazon.awssdk" % "secretsmanager" % awsSdkVersion
  val awsSQS = "software.amazon.awssdk" % "sqs" % awsSdkVersion
  val awsS3 = "software.amazon.awssdk" % "s3" % awsSdkVersion

  val awsLambda = "com.amazonaws" % "aws-lambda-java-core" % "1.2.1"
  val awsEvents = "com.amazonaws" % "aws-lambda-java-events" % "3.10.0"

  val scalaLambda = "io.github.mkotsur" %% "aws-lambda-scala" % "0.3.0"

  // Cats
  val catsCore = "org.typelevel" %% "cats-core" % catsVersion
  val catsEffect = "org.typelevel" %% "cats-effect" % catsEffectVersion

  // JSON libraries
  val circe = "io.circe" %% "circe-generic" % circeVersion
  val circeParser = "io.circe" %% "circe-parser" % circeVersion
  val circeConfig = "io.circe" %% "circe-config" % "0.8.0"
  val playJson = "com.typesafe.play" %% "play-json" % "2.9.2"
  val playJsonExtensions = "ai.x" %% "play-json-extensions" % "0.42.0"

  // HTTP clients
  val sttp = "com.softwaremill.sttp.client3" %% "core" % sttpVersion
  val sttpCirce = "com.softwaremill.sttp.client3" %% "circe" % sttpVersion
  val sttpAsyncHttpClientBackendCats =
    "com.softwaremill.sttp.client3" %% "async-http-client-backend-cats-ce2" % sttpVersion
  val sttpOkhttpBackend =
    "com.softwaremill.sttp.client3" %% "okhttp-backend" % sttpVersion
  val okhttp3 = "com.squareup.okhttp3" % "okhttp" % "4.9.2"
  val scalajHttp = "org.scalaj" %% "scalaj-http" % "2.4.2"

  // HTTP4S
  val http4sDsl = "org.http4s" %% "http4s-dsl" % http4sVersion
  val http4sCirce = "org.http4s" %% "http4s-circe" % http4sVersion
  val http4sServer = "org.http4s" %% "http4s-server" % http4sVersion
  val http4sCore = "org.http4s" %% "http4s-core" % http4sVersion

  // Guardian
  val simpleConfig = "com.gu" %% "simple-configuration-ssm" % "1.5.6"
  val supportInternationalisation =
    "com.gu" %% "support-internationalisation" % "0.13"
  val contentAuthCommon = "com.gu" %% "content-authorisation-common" % "0.6"

  // Other
  val zio = "dev.zio" %% "zio" % "1.0.7"
  val enumeratum = "com.beachape" %% "enumeratum" % "1.7.0"
  val scalaXml = "org.scala-lang.modules" %% "scala-xml" % "1.3.0"
  val stripe = "com.stripe" % "stripe-java" % "20.85.0"

  // Testing
  val diffx = "com.softwaremill.diffx" %% "diffx-scalatest" % "0.5.6" % Test
  val scalatest = "org.scalatest" %% "scalatest" % "3.2.10" % Test
  val scalaCheck = "org.scalacheck" %% "scalacheck" % "1.15.4" % Test
  val scalaMock = "org.scalamock" %% "scalamock" % "5.1.0" % Test

  /*
   * ===============================================================================================
   * These are versions of transitive dependencies in which a vulnerability has been resolved.
   * These are only here because there was no other resolution available.
   *
   * These dependencies should be removed as soon as the direct dependency they are consumed
   * by has been updated.  We don't want to clog up the repo with references to unused dependencies.
   */
  val nettyCodec = "io.netty" % "netty-codec" % "4.1.69.Final"
  /*
   * End of vulnerability fixes
   * ===============================================================================================
   */


  // to resolve merge clash of 'module-info.class'
  // see https://stackoverflow.com/questions/54834125/sbt-assembly-deduplicate-module-info-class
  val assemblyMergeStrategyDiscardModuleInfo = assembly / assemblyMergeStrategy := {
    case PathList("module-info.class") => MergeStrategy.discard
    case PathList("META-INF", "io.netty.versions.properties") => MergeStrategy.discard
    case PathList("mime.types") => MergeStrategy.filterDistinctLines
    /*
     * AWS SDK v2 includes a codegen-resources directory in each jar, with conflicting names.
     * This appears to be for generating clients from HTTP services.
     * So it's redundant in a binary artefact.
     */
    case PathList("codegen-resources", _*) => MergeStrategy.discard
    case x =>
      val oldStrategy = (assembly / assemblyMergeStrategy).value
      oldStrategy(x)
  }


}
