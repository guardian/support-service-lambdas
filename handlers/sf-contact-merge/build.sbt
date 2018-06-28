// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "sf-contact-merge"
description:= "Merges together the salesforce account referenced by a set of zuora accounts"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "sf-contact-merge.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::SF Contact Merge"
riffRaffArtifactResources += (file("handlers/sf-contact-merge/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies ++= Seq(
  "com.amazonaws" % "aws-lambda-java-log4j" % "1.0.0",
  "com.amazonaws" % "aws-lambda-java-core" % "1.2.0",
  "com.amazonaws" % "aws-java-sdk-s3" % "1.11.311",
  "log4j" % "log4j" % "1.2.17",
  //"com.squareup.okhttp3" % "okhttp" % "3.9.1",
  "com.typesafe.play" %% "play-json" % "2.6.9",
  "org.scalatest" %% "scalatest" % "3.0.1" % "test",
  "com.fasterxml.jackson.core" % "jackson-databind" % "2.8.11.1"
)
