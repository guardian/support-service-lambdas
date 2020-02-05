import Dependencies._

name := "delivery-problem-credit-processor"
description := "Applies a credit amendment to a subscription for a delivery problem."
version := "0.1.0-SNAPSHOT"

scalaVersion := "2.12.10"
scalacOptions += "-Ypartial-unification"

assemblyJarName := s"${name.value}.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := s"MemSub::Membership Admin::${name.value}"
riffRaffArtifactResources += (file(s"handlers/${name.value}/cfn.yaml"), "cfn/cfn.yaml")

assemblyMergeStrategyDiscardModuleInfo
