import Dependencies._

name := "holiday-stop-processor"
description := "Add a holiday credit amendment to a subscription."
version := "0.1.0-SNAPSHOT"

assemblyJarName := s"${name.value}.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := s"MemSub::Membership Admin::${name.value}"
riffRaffArtifactResources += (file(s"handlers/${name.value}/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  scalaLambda,
  awsS3,
) ++ logging

assemblyMergeStrategyDiscardModuleInfo
