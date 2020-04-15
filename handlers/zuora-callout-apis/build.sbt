// this is stuff for the root handlers, which will be moved to handlers/root at some point
import Dependencies._

name := "support-service-lambdas"
description:= "Handles auto-cancellations for membership and subscriptions"

assemblyJarName := "support-service-lambdas.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Auto Cancel"

addCommandAlias("dist", ";riffRaffArtifact")

libraryDependencies ++= Seq(
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "com.typesafe.scala-logging" %% "scala-logging" % "3.9.2",
  "com.amazonaws" % "aws-lambda-java-core" % "1.2.0",
  "com.squareup.okhttp3" % "okhttp" % "3.9.1",
  "org.scalatest" %% "scalatest" % "3.0.1" % "test",
  "com.stripe" % "stripe-java" % "5.28.0",
  jacksonDatabind
)

assemblyMergeStrategyDiscardModuleInfo
