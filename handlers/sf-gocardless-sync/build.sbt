import Dependencies._

name := "sf-gocardless-sync"
description:= "Polls GoCardless for direct debit mandate events and pushes into SalesForce"

assemblyJarName := "sf-gocardless-sync.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Subscriptions::Lambdas::GoCardless SalesForce Sync"
riffRaffArtifactResources += (file("handlers/sf-gocardless-sync/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  playJsonExtensions
)

assemblyMergeStrategyDiscardModuleInfo
