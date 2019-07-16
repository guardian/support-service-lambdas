// this is stuff for the root handlers, which will be moved to handlers/root at some point

name := "support-service-lambdas"
description:= "Handles auto-cancellations for membership and subscriptions"

assemblyJarName := "support-service-lambdas.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Auto Cancel"

addCommandAlias("dist", ";riffRaffArtifact")

libraryDependencies ++= Seq(
  "com.amazonaws" % "aws-lambda-java-core" % "1.2.0",
  "com.squareup.okhttp3" % "okhttp" % "3.9.1",
  "org.scalaz" %% "scalaz-core" % "7.2.18",
  "com.typesafe.play" %% "play-json" % "2.6.9",
  "org.scalatest" %% "scalatest" % "3.0.1" % "test",
  "com.stripe" % "stripe-java" % "5.28.0",
  "com.fasterxml.jackson.core" % "jackson-databind" % "2.8.11.1"
)
