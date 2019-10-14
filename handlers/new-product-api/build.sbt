// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
import Dependencies._

name := "new-product-api"
description:= "Add subscription to account"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "new-product-api.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::New product API"
riffRaffArtifactResources += (file("handlers/new-product-api/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(supportInternationalisation)

assemblyMergeStrategyDiscardModuleInfo