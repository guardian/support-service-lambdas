// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
import Dependencies._

name := "batch-email-sender"
description:= "Receive batches of emails to be sent, munge them into an appropriate format and put them on the email sending queue."

scalacOptions += "-Ypartial-unification"

assemblyJarName := "batch-email-sender.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Batch Email Sender"
riffRaffArtifactResources += (file("handlers/batch-email-sender/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  supportInternationalisation,
  diffx
)

assemblyMergeStrategyDiscardModuleInfo
