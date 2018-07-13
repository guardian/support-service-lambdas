// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "identity-retention"
description:= "Confirms whether an identity account can be deleted, from a reader revenue perspective"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "identity-retention.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Identity Retention"
riffRaffArtifactResources += (file("handlers/identity-retention/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
)
