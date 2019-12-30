import Dependencies._

name := "fulfilment-date-calculator"
description:= "Generate files in S3 bucket containing relevant fulfilment-related dates, for example, acquisitionsStartDate, holidayStopFirstAvailableDate, etc."
version := "0.1.0-SNAPSHOT"

scalaVersion := "2.12.10"
scalacOptions += "-Ypartial-unification"

assemblyJarName := s"${name.value}.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := s"MemSub::Membership Admin::${name.value}"
riffRaffArtifactResources += (file(s"handlers/${name.value}/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  "io.github.mkotsur" %% "aws-lambda-scala" % "0.1.1",
  "org.scalaj" %% "scalaj-http" % "2.4.1",
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "com.typesafe.scala-logging" %% "scala-logging" % "3.9.2",
  "com.beachape" %% "enumeratum" % "1.5.13"
)

assemblyMergeStrategyDiscardModuleInfo