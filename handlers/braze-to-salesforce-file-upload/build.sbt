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
  "io.github.mkotsur" %% "aws-lambda-scala" % "0.2.0",
  "org.scalaj" %% "scalaj-http" % "2.4.2",
  Dependencies.awsS3,
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "com.typesafe.scala-logging" %% "scala-logging" % "3.9.2",
  "com.github.pathikrit" %% "better-files" % "3.9.1"
)

assemblyMergeStrategyDiscardModuleInfo