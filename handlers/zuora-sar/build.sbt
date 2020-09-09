import Dependencies._

name := "zuora-sar"
description:= "Performs a Subject Access Requests against Zuora"

assemblyJarName := "zuora-sar.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Sar"
riffRaffArtifactResources += (file("handlers/zuora-sar/cfn.yaml"), "cfn/cfn.yaml")

assemblyMergeStrategyDiscardModuleInfo