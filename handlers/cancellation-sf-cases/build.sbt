import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "cancellation-sf-cases"
description:= "Create/update SalesForce cases for self service cancellation tracking"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "cancellation-sf-cases.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Subscriptions::Lambdas::Cancellation SF Cases"
riffRaffArtifactResources += (file("handlers/cancellation-sf-cases/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  "com.gu.identity" %% "identity-cookie" % "3.160",
  "com.gu" %% "identity-test-users" % "0.7"
)