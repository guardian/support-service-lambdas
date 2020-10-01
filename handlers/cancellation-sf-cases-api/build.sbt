import Dependencies._

name := "cancellation-sf-cases-api"
description:= ""

assemblyJarName := "cancellation-sf-cases-api.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := ""
riffRaffArtifactResources += (file("handlers/cancellation-sf-cases-api/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(

)

assemblyMergeStrategyDiscardModuleInfo