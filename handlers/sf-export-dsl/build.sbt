// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "sf-export-dsl"
description:= "Export salesforce data to the data lake"

scalacOptions += "-Ypartial-unification"

assemblyJarName := "sf-export-dsl.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::SF Export DSL"
riffRaffArtifactResources += (file("handlers/sf-export-dsl/target/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies += "org.scala-lang.modules" %% "scala-xml" % "1.1.0"
