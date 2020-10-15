// FIXME: This sub-project builds.sbt should be removed
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
  awsLambda,
  okhttp3,
  scalatest,
  stripe,
  jacksonDatabind
) ++ logging

assemblyMergeStrategyDiscardModuleInfo
