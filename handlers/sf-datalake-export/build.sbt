import Dependencies._

// "Any .sbt files in foo, say foo/build.sbt, will be merged with the build definition for the entire build, but scoped to the hello-foo project."
// https://www.scala-sbt.org/0.13/docs/Multi-Project.html
name := "sf-datalake-export"
description:= "Export salesforce data to the data lake"

assemblyJarName := "sf-datalake-export.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::SF Data Lake Export"
riffRaffArtifactResources += (file("handlers/sf-datalake-export/cfn.yaml"), "cfn/cfn.yaml")

libraryDependencies += "org.scala-lang.modules" %% "scala-xml" % "1.3.0"

assemblyMergeStrategyDiscardModuleInfo