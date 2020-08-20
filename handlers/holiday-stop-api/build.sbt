import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "holiday-stop-api"
description:= "CRUD API for Holiday Stop Requests stored in SalesForce"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "holiday-stop-api.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := s"MemSub::Membership Admin::${name.value}"
riffRaffArtifactResources += (file("handlers/holiday-stop-api/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  playJsonExtensions
)

assemblyMergeStrategyDiscardModuleInfo
