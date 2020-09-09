import Dependencies._

name := "braze-to-salesforce-file-upload"
description:= "Braze to Salesforce file upload"
assemblyJarName := s"${name.value}.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := s"MemSub::Membership Admin::${name.value}"
riffRaffArtifactResources += (file(s"handlers/${name.value}/cfn.yaml"), "cfn/cfn.yaml")
libraryDependencies ++= Seq(
  scalaLambda,
  scalajHttp,
  Dependencies.awsS3,
  "com.github.pathikrit" %% "better-files" % "3.9.1"
) ++ logging

assemblyMergeStrategyDiscardModuleInfo