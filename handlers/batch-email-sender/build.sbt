import Dependencies._

name := "batch-email-sender"
description:= "Receive batches of emails to be sent, munge them into an appropriate format and put them on the email sending queue."

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
