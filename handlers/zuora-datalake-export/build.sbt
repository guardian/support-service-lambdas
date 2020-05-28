import Dependencies._

name := "zuora-datalake-export"
description:= "Zuora to Datalake export using Stateful AQuA API which exports incremental changes"
scalacOptions += "-Ypartial-unification"
assemblyJarName := "zuora-datalake-export.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Data Lake Export"
riffRaffArtifactResources += (file("handlers/zuora-datalake-export/cfn.yaml"), "cfn/cfn.yaml")
libraryDependencies ++= Seq(
  "io.github.mkotsur" %% "aws-lambda-scala" % "0.1.1",
  "org.scalaj" %% "scalaj-http" % "2.4.1",
  Dependencies.awsS3,
  "ch.qos.logback" % "logback-classic" % "1.2.3",
  "com.typesafe.scala-logging" %% "scala-logging" % "3.9.2",
  "com.beachape" %% "enumeratum" % "1.5.13"
)

assemblyMergeStrategyDiscardModuleInfo