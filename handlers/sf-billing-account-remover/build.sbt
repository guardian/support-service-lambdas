//import Dependencies._

name := "sf-billing-account-remover"
description := "Export salesforce data to the data lake"

assemblyJarName := "sf-billing-account-remover.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::SF Billing Account Remover"
riffRaffArtifactResources += (file(
  "handlers/sf-billing-account-remover/cfn.yaml"
), "cfn/cfn.yaml")

libraryDependencies += "org.scalaj" %% "scalaj-http" % "2.4.2"
val circeVersion = "0.12.3"

libraryDependencies ++= Seq(
  "io.circe" %% "circe-core",
  "io.circe" %% "circe-generic",
  "io.circe" %% "circe-parser"
).map(_ % circeVersion)
