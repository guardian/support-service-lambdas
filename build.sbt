name := "zuora-auto-cancel"
description:= "Handles auto-cancellations for membership and subscriptions"

scalaVersion := "2.12.4"
version      := "0.0.1"
organization := "com.gu"

scalacOptions ++= Seq(
  "-deprecation",
  "-encoding", "UTF-8",
  "-feature",
  "-target:jvm-1.8",
  "-language:existentials",
  "-language:higherKinds",
  "-language:implicitConversions",
  "-unchecked",
  "-Xfatal-warnings",
  "-Xlint",
  "-Yno-adapted-args",
  "-Ywarn-dead-code",
  "-Ywarn-numeric-widen",
  "-Ywarn-value-discard"
)

// currently the original code is lying in the root, in due course we need to make three separate sub projects for these original lambdas
// they should produce their own self contained jar to reduce the artifact size and startup time.  Any shared code can be
// a set of projects that is "dependsOn(..)" by the sharing projects.  Don't be afraid to restructure things to keep the code nice!
lazy val root = (project in file(".")).enablePlugins(RiffRaffArtifact).aggregate(`identity-backfill`)

lazy val `identity-backfill` = project // when using the "project identity-backfill" command it uses the lazy val name
  .enablePlugins(RiffRaffArtifact)

assemblyJarName := "zuora-auto-cancel.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")
riffRaffManifestProjectName := "MemSub::Membership Admin::Zuora Auto Cancel"

addCommandAlias("dist", ";riffRaffArtifact")

libraryDependencies ++= Seq(
  "com.amazonaws" % "aws-lambda-java-log4j" % "1.0.0",
  "com.amazonaws" % "aws-lambda-java-core" % "1.2.0",
  "com.amazonaws" % "aws-java-sdk-s3" % "1.11.265",
  "log4j" % "log4j" % "1.2.17",
  "com.squareup.okhttp3" % "okhttp" % "3.9.1",
  "org.scalaz" %% "scalaz-core" % "7.2.18",
  "com.typesafe.play" %% "play-json" % "2.6.8",
  "org.scalatest" %% "scalatest" % "3.0.1" % "test",
  "com.stripe" % "stripe-java" % "5.28.0"
)

initialize := {
  val _ = initialize.value
  assert(sys.props("java.specification.version") == "1.8",
    "Java 8 is required for this project.")
}