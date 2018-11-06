// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "sf-gocardless-sync"
description:= "Polls GoCardless for direct debit mandate updates and pushes into SalesForce"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "sf-gocardless-sync.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Subscriptions::Lambdas::GoCardless SalesForce Sync"
riffRaffArtifactResources += (file("handlers/sf-gocardless-sync/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  "ai.x" %% "play-json-extensions" % "0.10.0"
)
