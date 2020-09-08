import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "catalog-service"
description:= "Download the Zuora Catalog and store the JSON in S3"

assemblyJarName := "catalog-service.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Subscriptions::Lambdas::Catalog Service"
riffRaffArtifactResources += (file("handlers/catalog-service/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
)

resolvers ++= Seq(
  Resolver.sonatypeRepo("releases")
)

assemblyMergeStrategyDiscardModuleInfo