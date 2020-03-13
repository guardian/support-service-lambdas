import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "sf-move-subscriptions-api"
description:= "API for for moving subscriptions in SalesForce"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "sf-move-subscriptions-api.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := s"MemSub::Membership Admin::${name.value}"
riffRaffArtifactResources += (file("handlers/sf-move-subscriptions-api/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  playJsonExtensions
)

assemblyMergeStrategyDiscardModuleInfo