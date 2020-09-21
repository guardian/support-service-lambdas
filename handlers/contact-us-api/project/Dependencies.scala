import sbt._

object Dependencies {
  val scalaTestVersion = "3.1.1"
  val circeVersion = "0.12.3"
  val scalajHttpVersion = "2.4.2"

  val scalaTest = "org.scalatest" %% "scalatest" % scalaTestVersion % Test
  val circe = "io.circe" %% "circe-generic" % circeVersion
  val circeParser = "io.circe" %% "circe-parser" % circeVersion
  val scalajHttp = "org.scalaj" %% "scalaj-http" % scalajHttpVersion
}
