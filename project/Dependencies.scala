import sbt._
import sbtassembly.AssemblyKeys.assembly
import sbtassembly.AssemblyPlugin.autoImport.{MergeStrategy, assemblyMergeStrategy}
import sbtassembly.PathList

object Dependencies {
  val awsSdkVersion = "2.21.10"
  val circeVersion = "0.13.0"
  val sttpVersion = "3.8.15"
  val http4sVersion = "0.21.34"
  val catsVersion = "2.9.0"
  val catsEffectVersion = "2.5.5"

  val logging: Seq[ModuleID] = Seq(
    "ch.qos.logback" % "logback-classic" % "1.4.7",
    "com.typesafe.scala-logging" %% "scala-logging" % "3.9.5",
  )

  // AWS
  val awsCloudwatch = "software.amazon.awssdk" % "cloudwatch" % awsSdkVersion
  val awsSdkLambda = "software.amazon.awssdk" % "lambda" % awsSdkVersion
  val awsSecretsManager = "software.amazon.awssdk" % "secretsmanager" % awsSdkVersion
  val awsSQS = "software.amazon.awssdk" % "sqs" % awsSdkVersion
  val awsS3 = "software.amazon.awssdk" % "s3" % awsSdkVersion
  val awsDynamo = "software.amazon.awssdk" % "dynamodb" % awsSdkVersion

  val awsLambda = "com.amazonaws" % "aws-lambda-java-core" % "1.2.2"
  val awsEvents = "com.amazonaws" % "aws-lambda-java-events" % "3.11.2"

  val scalaLambda = "io.github.mkotsur" %% "aws-lambda-scala" % "0.3.0"

  // GCP
  val googleBigQuery = "com.google.cloud" % "google-cloud-bigquery" % "2.34.0"

  // Cats
  val catsCore = "org.typelevel" %% "cats-core" % catsVersion
  val catsEffect = "org.typelevel" %% "cats-effect" % catsEffectVersion

  // JSON libraries
  val circe = "io.circe" %% "circe-generic" % circeVersion
  val circeParser = "io.circe" %% "circe-parser" % circeVersion
  val circeConfig = "io.circe" %% "circe-config" % "0.8.0"
  val playJson = "org.playframework" %% "play-json" % "3.0.1"

  // upickle here is a temporary redundancy of circe while we are migrating to it
  val upickle = "com.lihaoyi" %% "upickle" % "3.1.0"

  // HTTP clients
  val sttp = "com.softwaremill.sttp.client3" %% "core" % sttpVersion
  val sttpCirce = "com.softwaremill.sttp.client3" %% "circe" % sttpVersion
  val sttpAsyncHttpClientBackendCats =
    "com.softwaremill.sttp.client3" %% "async-http-client-backend-cats-ce2" % sttpVersion
  val sttpOkhttpBackend =
    "com.softwaremill.sttp.client3" %% "okhttp-backend" % sttpVersion
  val okhttp3 = "com.squareup.okhttp3" % "okhttp" % "4.10.0"
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
  val zio = "dev.zio" %% "zio" % "1.0.17"
  val zio2Version = "2.0.13"
  val zio2 = "dev.zio" %% "zio" % zio2Version
  val tapirVersion = "1.9.2"
  val enumeratum = "com.beachape" %% "enumeratum" % "1.7.2"
  val scalaXml = "org.scala-lang.modules" %% "scala-xml" % "2.1.0"
  val stripe = "com.stripe" % "stripe-java" % "22.20.0"
  val parallelCollections = "org.scala-lang.modules" %% "scala-parallel-collections" % "1.0.4"

  // Testing
  val diffx = "com.softwaremill.diffx" %% "diffx-scalatest-should" % "0.9.0" % Test
  val scalatest = "org.scalatest" %% "scalatest" % "3.2.16" % Test
  val scalaCheck = "org.scalacheck" %% "scalacheck" % "1.17.0" % Test
  val scalaMock = "org.scalamock" %% "scalamock" % "5.2.0" % Test
  val mockito = "org.mockito" % "mockito-core" % "5.3.1" % Test
  val nettyCodec = "io.netty" % "netty-codec" % "4.1.92.Final"
  val jacksonVersion = "2.13.2"
  val jacksonDatabindVersion = "2.13.2.2"

  val jacksonDependencies: Seq[ModuleID] = Seq(
    "com.fasterxml.jackson.core" % "jackson-core" % jacksonVersion,
    "com.fasterxml.jackson.core" % "jackson-annotations" % jacksonVersion,
    "com.fasterxml.jackson.datatype" % "jackson-datatype-jdk8" % jacksonVersion,
    "com.fasterxml.jackson.datatype" % "jackson-datatype-jsr310" % jacksonVersion,
    "com.fasterxml.jackson.core" % "jackson-databind" % jacksonDatabindVersion,
    "com.fasterxml.jackson.dataformat" % "jackson-dataformat-cbor" % jacksonVersion,
    "com.fasterxml.jackson.module" % "jackson-module-parameter-names" % jacksonVersion,
    "com.fasterxml.jackson.module" %% "jackson-module-scala" % jacksonVersion,
  )

  /*
   * End of vulnerability fixes
   * ===============================================================================================
   */

  // to resolve merge clash of 'module-info.class'
  // see https://stackoverflow.com/questions/54834125/sbt-assembly-deduplicate-module-info-class
  val assemblyMergeStrategyDiscardModuleInfo = assembly / assemblyMergeStrategy := {
    case PathList("META-INF", "maven", "org.webjars", "swagger-ui", "pom.properties") =>
      MergeStrategy.singleOrError
    case PathList(ps @ _*) if ps.last == "module-info.class" => MergeStrategy.discard
    case PathList(ps @ _*) if ps.last == "deriving.conf" => MergeStrategy.filterDistinctLines
    case PathList("META-INF", "io.netty.versions.properties") => MergeStrategy.discard
    case PathList("mime.types") => MergeStrategy.filterDistinctLines
    case PathList("logback.xml") => MergeStrategy.preferProject
    /*
     * AWS SDK v2 includes a codegen-resources directory in each jar, with conflicting names.
     * This appears to be for generating clients from HTTP services.
     * So it's redundant in a binary artefact.
     */
    case PathList("codegen-resources", _*) => MergeStrategy.discard
    case PathList("META-INF", "FastDoubleParser-LICENSE") => MergeStrategy.discard
    case x =>
      val oldStrategy = (assembly / assemblyMergeStrategy).value
      oldStrategy(x)
  }

}
