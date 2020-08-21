import Dependencies._

name := "sf-contact-merge"
description:= "Merges together the salesforce account referenced by a set of zuora accounts"

assemblyJarName := "sf-contact-merge.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::SF Contact Merge"
riffRaffArtifactResources += (file("handlers/sf-contact-merge/cfn.yaml"), "cfn/cfn.yaml")

assemblyMergeStrategyDiscardModuleInfo