// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "metric-push-api"
description:= "HTTP API to push a metric to cloudwatch so we can alarm on errors"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "metric-push-api.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Metric Push API"
riffRaffArtifactResources += (file("handlers/metric-push-api/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq()
