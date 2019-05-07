name := "zuora-gw-holiday-stop"
description := "Add a holiday credit amendment to a subscription."
version := "0.1.0-SNAPSHOT"

scalaVersion := "2.12.8"
scalacOptions += "-Ypartial-unification"

val sttpVersion = "1.5.15"

libraryDependencies ++= Seq(
  "io.github.mkotsur" %% "aws-lambda-scala" % "0.1.1",
  "com.softwaremill.sttp" %% "core" % sttpVersion,
  "com.softwaremill.sttp" %% "circe" % sttpVersion,
  "io.circe" %% "circe-generic" % "0.11.0",
  "org.scalatest" %% "scalatest" % "3.0.7" % Test
)
