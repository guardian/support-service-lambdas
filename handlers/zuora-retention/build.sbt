import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "zuora-retention"
description:= "find and mark accounts that are out of the retention period"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "zuora-retention.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Retention"
riffRaffArtifactResources += (file("handlers/zuora-retention/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
)

resolvers ++= Seq(
  Resolver.sonatypeRepo("releases")
)

assemblyMergeStrategyDiscard