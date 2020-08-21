import Dependencies._

name := "sf-move-subscriptions-api"
description:= "API for for moving subscriptions in ZUORA from SalesForce"

assemblyJarName := s"${name.value}.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := s"MemSub::Membership Admin::${name.value}"
riffRaffArtifactResources += (file(s"handlers/${name.value}/cdk-cfn.yaml"), "cfn/cdk-cfn.yaml")

assemblyMergeStrategyDiscardModuleInfo