import Dependencies._

name := "digital-voucher-api"
description:= "API for integrating Imovos digital voucher services"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "digital-voucher-api.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Subscriptions::Lambdas::Digital Voucher API"
riffRaffArtifactResources += (file("handlers/digital-voucher-api/cfn.yaml"), "cfn/cfn.yaml")

resolvers ++= Seq(
  Resolver.sonatypeRepo("releases")
)

assemblyMergeStrategyDiscardModuleInfo