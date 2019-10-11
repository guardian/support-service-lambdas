import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "identity-backfill"
description:= "links subscriptions with identity accounts"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "identity-backfill.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Identity Backfill"
riffRaffArtifactResources += (file("handlers/identity-backfill/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  "com.gu" %% "support-internationalisation" % "0.9"
)

assemblyMergeStrategyDiscard