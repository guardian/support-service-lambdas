import Dependencies._

name := "zuora-datalake-export"
description:= "Zuora to Datalake export using Stateful AQuA API which exports incremental changes"
assemblyJarName := "zuora-datalake-export.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Data Lake Export"
riffRaffArtifactResources += (file("handlers/zuora-datalake-export/cfn.yaml"), "cfn/cfn.yaml")
libraryDependencies ++= Seq(
  scalaLambda,
  scalajHttp,
  awsS3,
  enumeratum,
) ++ logging

assemblyMergeStrategyDiscardModuleInfo
