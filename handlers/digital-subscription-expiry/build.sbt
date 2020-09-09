import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "digital-subscription-expiry"
description:= "check digital subscription expiration for authorisation purposes"

assemblyJarName := "digital-subscription-expiry.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Subscriptions::Lambdas::Digital Subscription Expiry"
riffRaffArtifactResources += (file("handlers/digital-subscription-expiry/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  contentAuthCommon
)

resolvers ++= Seq(
  Resolver.sonatypeRepo("releases")
)

assemblyMergeStrategyDiscardModuleInfo
