import Dependencies._

name := "dev-env-cleaner"
description:= "Cleans up the salesforce to free up storage via 360 sync/zuora"

assemblyJarName := "lambda.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::DEV Env Cleaner"
riffRaffArtifactResources += (file("handlers/dev-env-cleaner/cfn.yaml"), "cfn/cfn.yaml")

assemblyMergeStrategyDiscardModuleInfo

libraryDependencies ++= Seq(
  "com.amazonaws" % "aws-java-sdk-cloudwatch" % awsVersion,
)
