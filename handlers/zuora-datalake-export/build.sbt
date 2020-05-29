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

lazy val deployAwsLambda = taskKey[Unit]("Directly update AWS lambda code from DEV instead of via RiffRaff for faster feedback loop")
deployAwsLambda := {
  import scala.sys.process._
  assembly.value
  "aws lambda update-function-code --function-name zuora-datalake-export-CODE --zip-file fileb://handlers/zuora-datalake-export/target/scala-2.12/zuora-datalake-export.jar --profile membership --region eu-west-1" !
}