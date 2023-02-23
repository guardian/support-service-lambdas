// FIXME: This sub-project builds.sbt should be removed
import Dependencies._

name := "support-service-lambdas"
description := "Handles auto-cancellations for membership and subscriptions"

assemblyJarName := "support-service-lambdas.jar"

riffRaffAwsRegion := "eu-west-1"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Auto Cancel"
riffRaffArtifactResources += (file("handlers/zuora-callout-apis/cloudformation.yaml"), "cfn/cfn.yaml")

addCommandAlias("dist", ";riffRaffArtifact")

libraryDependencies ++= Seq(
  awsLambda,
  okhttp3,
  scalatest,
  stripe,
) ++ logging

assemblyMergeStrategyDiscardModuleInfo
