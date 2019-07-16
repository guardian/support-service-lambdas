import sbt._

object Dependencies {
  
  val awsVersion = "1.11.574"

  val okhttp3 = "com.squareup.okhttp3" % "okhttp" % "3.9.1"
  val logging = Seq(
    ("com.amazonaws" % "aws-lambda-java-log4j" % "1.0.0").exclude("log4j", "log4j"),
    "org.slf4j" % "log4j-over-slf4j" % "1.7.26",
    "ch.qos.logback" % "logback-classic" % "1.2.3"
  )
  val scalaz = "org.scalaz" %% "scalaz-core" % "7.2.18"
  val playJson = "com.typesafe.play" %% "play-json" % "2.6.9"
  val playJsonExtensions = "ai.x" %% "play-json-extensions" % "0.30.1"
  val scalatest = "org.scalatest" %% "scalatest" % "3.0.1" % "test"
  val jacksonDatabind = "com.fasterxml.jackson.core" % "jackson-databind" % "2.8.11.1"
  val awsS3 = "com.amazonaws" % "aws-java-sdk-s3" % awsVersion
  val awsSQS = "com.amazonaws" % "aws-java-sdk-sqs" % awsVersion
  val awsSES = "com.amazonaws" % "aws-java-sdk-ses" % awsVersion
  val awsLambda = "com.amazonaws" % "aws-lambda-java-core" % "1.2.0"
  val supportInternationalisation = "com.gu" %% "support-internationalisation" % "0.9"
}
