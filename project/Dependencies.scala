import sbt._
import sbtassembly.AssemblyKeys.assembly
import sbtassembly.AssemblyPlugin.autoImport.{MergeStrategy, assemblyMergeStrategy}
import sbtassembly.PathList

object Dependencies {
  
  val awsVersion = "1.11.574"

  val circeVersion = "0.11.1"
  val sttpVersion = "1.5.17"
  val http4sVersion = "0.20.3"
  val catsVersion = "1.6.1"
  val catsEffectVersion = "1.3.1"

  val okhttp3 = "com.squareup.okhttp3" % "okhttp" % "3.9.1"
  val logging = Seq(
    "ch.qos.logback" % "logback-classic" % "1.2.3",
    "com.typesafe.scala-logging" %% "scala-logging" % "3.9.2"
  )
  val scalaz = "org.scalaz" %% "scalaz-core" % "7.2.18"
  val playJson = "com.typesafe.play" %% "play-json" % "2.8.0"
  val playJsonExtensions = "ai.x" %% "play-json-extensions" % "0.30.1"
  val scalatest = "org.scalatest" %% "scalatest" % "3.0.1" % Test
  val scalaCheck = "org.scalacheck" %% "scalacheck" % "1.14.0" % Test
  val jacksonDatabind = "com.fasterxml.jackson.core" % "jackson-databind" % "2.10.0"
  val awsS3 = "com.amazonaws" % "aws-java-sdk-s3" % awsVersion
  val awsSQS = "com.amazonaws" % "aws-java-sdk-sqs" % awsVersion
  val awsSES = "com.amazonaws" % "aws-java-sdk-ses" % awsVersion
  val awsLambda = "com.amazonaws" % "aws-lambda-java-core" % "1.2.0"
  val supportInternationalisation = "com.gu" %% "support-internationalisation" % "0.9"
  val circe = "io.circe" %% "circe-generic" % circeVersion
  val circeParser = "io.circe" %% "circe-parser" % circeVersion
  val circeJava8 = "io.circe" %% "circe-java8" % circeVersion
  val sttp = "com.softwaremill.sttp" %% "core" % sttpVersion
  val sttpCirce = "com.softwaremill.sttp" %% "circe" % sttpVersion
  val sttpCats = "com.softwaremill.sttp" %% "cats" % sttpVersion
  val sttpAsycHttpClientBackendCats = "com.softwaremill.sttp" %% "async-http-client-backend-cats" % sttpVersion
  val mouse = "org.typelevel" %% "mouse" % "0.23" // can be removed once we move to Scala 2.13 (native 'tap')
  val enumeratum = "com.beachape" %% "enumeratum" % "1.5.13"
  val http4sLambda = "io.github.howardjohn" %% "http4s-lambda" % "0.4.0"
  val http4sDsl = "org.http4s" %% "http4s-dsl" % http4sVersion
  val http4sCirce = "org.http4s" %% "http4s-circe" % http4sVersion
  val http4sServer = "org.http4s" %% "http4s-server" % http4sVersion
  val catsCore = "org.typelevel" %% "cats-core" % catsVersion
  val catsEffect = "org.typelevel" %% "cats-effect" % catsEffectVersion
  val scalaLambda = "io.github.mkotsur" %% "aws-lambda-scala" % "0.1.1"


  // to resolve merge clash of 'module-info.class'
  // see https://stackoverflow.com/questions/54834125/sbt-assembly-deduplicate-module-info-class
  val assemblyMergeStrategyDiscardModuleInfo = assemblyMergeStrategy in assembly := {
    case PathList("module-info.class") => MergeStrategy.discard
    case PathList("META-INF", "io.netty.versions.properties") => MergeStrategy.discard
    case x =>
      val oldStrategy = (assemblyMergeStrategy in assembly).value
      oldStrategy(x)
  }

}
