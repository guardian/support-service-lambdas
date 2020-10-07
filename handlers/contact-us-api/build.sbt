import Dependencies._

name := "contact-us-api"
description:= "Transforms a request from the Contact Us form into a Salesforce case"

assemblyJarName := "contact-us.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Subscriptions::Lambdas::Contact Us"
riffRaffArtifactResources += (file("handlers/contact-us-api/cfn.yaml"), "cfn/cfn.yaml")

assemblyMergeStrategyDiscardModuleInfo