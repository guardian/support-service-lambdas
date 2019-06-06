name := "holiday-stop-processor"
description := "Add a holiday credit amendment to a subscription."
version := "0.1.0-SNAPSHOT"

scalaVersion := "2.12.8"
scalacOptions += "-Ypartial-unification"

assemblyJarName := s"${name.value}.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := s"MemSub::Membership Admin::${name.value}"
riffRaffArtifactResources += (file(s"handlers/${name.value}/cfn.yaml"), "cfn/cfn.yaml")

val sttpVersion = "1.5.17"

libraryDependencies ++= Seq(
  "io.github.mkotsur" %% "aws-lambda-scala" % "0.1.1",
  "com.softwaremill.sttp" %% "core" % sttpVersion,
  "com.softwaremill.sttp" %% "circe" % sttpVersion,
  "io.circe" %% "circe-generic" % "0.11.1",
  "com.amazonaws" % "aws-java-sdk-s3" % "1.11.566",
  "org.slf4j" % "slf4j-api" % "1.7.25",
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "com.typesafe.scala-logging" %% "scala-logging" % "3.9.2",
  "org.scalatest" %% "scalatest" % "3.0.7" % Test,
  "org.scalacheck" %% "scalacheck" % "1.14.0" % Test
)
