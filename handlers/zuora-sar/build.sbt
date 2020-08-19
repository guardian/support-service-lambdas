import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "zuora-sar"
description:= "Performs a Subject Access Requests against Zuora"

assemblyJarName := "zuora-sar.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Sar"
riffRaffArtifactResources += (file("handlers/zuora-sar/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq()

assemblyMergeStrategyDiscardModuleInfo