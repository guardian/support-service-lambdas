import Dependencies._

name := "zuora-retention"
description:= "find and mark accounts that are out of the retention period"

assemblyJarName := "zuora-retention.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Retention"
riffRaffArtifactResources += (file("handlers/zuora-retention/cfn.yaml"), "cfn/cfn.yaml")

resolvers ++= Seq(
  Resolver.sonatypeRepo("releases")
)

assemblyMergeStrategyDiscardModuleInfo