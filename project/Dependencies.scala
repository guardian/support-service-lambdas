import sbt._

object Dependencies {

  val okhttp3 = "com.squareup.okhttp3" % "okhttp" % "3.9.1"
  val logging = "com.amazonaws" % "aws-lambda-java-log4j" % "1.0.0"
  val scalaz = "org.scalaz" %% "scalaz-core" % "7.2.18"
  val playJson = "com.typesafe.play" %% "play-json" % "2.6.9"
  val scalatest = "org.scalatest" %% "scalatest" % "3.0.1" % "test"
  val jacksonDatabind = "com.fasterxml.jackson.core" % "jackson-databind" % "2.8.11.1"
  val awsS3 = "com.amazonaws" % "aws-java-sdk-s3" % "1.11.311"
  val awsSQS = "com.amazonaws" % "aws-java-sdk-sqs" % "1.11.371"
  val awsLambda = "com.amazonaws" % "aws-lambda-java-core" % "1.2.0"
  val supportInternationalisation = "com.gu" %% "support-internationalisation" % "0.9"
}
