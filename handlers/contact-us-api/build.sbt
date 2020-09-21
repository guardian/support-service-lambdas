import Dependencies._

ThisBuild / scalaVersion     := "2.13.2"
ThisBuild / version          := "0.1.0-SNAPSHOT"
ThisBuild / organization     := "com.gu"
ThisBuild / organizationName := "gu"

lazy val root = (project in file("."))
  .settings(
    name := "contact-us-api",
    libraryDependencies ++= Seq(
      circe,
      circeParser,
      scalaTest,
      scalajHttp
    )
  )

// See https://www.scala-sbt.org/1.x/docs/Using-Sonatype.html for instructions on how to publish to Sonatype.
