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

libraryDependencies ++= Seq()
