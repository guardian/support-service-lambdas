import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "cancellation-sf-cases-api"
description:= "Create/update SalesForce cases for self service cancellation tracking"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "cancellation-sf-cases-api.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership::Lambdas::Cancellation SF Cases API"
riffRaffArtifactResources += (file("handlers/cancellation-sf-cases-api/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  playJsonExtensions
)

assemblyMergeStrategyDiscardModuleInfo