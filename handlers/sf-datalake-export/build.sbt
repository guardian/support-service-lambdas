import Dependencies._

name := "sf-datalake-export"
description:= "Export salesforce data to the data lake"

assemblyJarName := "sf-datalake-export.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::SF Data Lake Export"
riffRaffArtifactResources += (file("handlers/sf-datalake-export/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies += scalaXml

assemblyMergeStrategyDiscardModuleInfo