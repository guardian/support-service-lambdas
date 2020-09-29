import Dependencies._

name := "sf-billing-account-remover"
description := "Removes Billing Accounts and related records from Salesforce"

assemblyJarName := "sf-billing-account-remover.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::SF Billing Account Remover"
riffRaffArtifactResources += (file(
  "handlers/sf-billing-account-remover/cfn.yaml"
), "cfn/cfn.yaml")

libraryDependencies ++= Seq(circe, circeParser, scalajHttp)

assemblyMergeStrategyDiscardModuleInfo
