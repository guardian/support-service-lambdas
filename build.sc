import java.io.{FileOutputStream, PrintWriter}

import ammonite.ops._
import mill._
import mill.scalalib._
import mill.util.Ctx
import upickle.default.{macroRW, ReadWriter => RW}
import $ivy.`com.amazonaws:aws-java-sdk-s3:1.11.311`
import com.amazonaws.services.s3.{AmazonS3, AmazonS3Client, AmazonS3ClientBuilder}
import com.amazonaws.auth.{AWSCredentialsProvider, AWSCredentialsProviderChain, DefaultAWSCredentialsProviderChain}
import com.amazonaws.regions.Regions

object handlers extends Module {

  import lib._

  object `sf-contact-merge` extends ScalaSettings {

    /*
    {
    "projectName":"MemSub::Membership Admin::SF Contact Merge",
    "buildNumber":"unknown",
    "startTime":"2018-08-05T20:20:14.326Z",
    "revision":"2676716f3aa49736d77a6c45f9c1011a3167dc98",
    "vcsURL":"git@github.com:guardian/zuora-auto-cancel.git",
    "branch":"update-identityid-sf"
    }
     */

    val map = Map(
    "handlers/sf-contact-merge/target/scala-2.12/sf-contact-merge.jar" -> "sf-contact-merge/sf-contact-merge.jar",
    "handlers/sf-contact-merge/riff-raff.yaml" -> "riff-raff.yaml",
    "handlers/sf-contact-merge/cfn.yaml" -> "cfn/cfn.yaml"
    )

    override def moduleDeps = Seq(zuora, handler, effects, effects.test, lib.test.test)

    object test extends Tests2

    def createArtifact(ref: PathRef)(implicit ctx: Ctx.Dest): PathRef = {
      println(s"ref: $ref")
      println(s"ref: ${ref.path}")
      println(s"ctx: $ctx")
      println(s"ctx dest: ${ctx.dest}")
      val outputPath = ctx.dest / "build.json"
      val client = AmazonS3ClientBuilder
        .standard
        .withCredentials(new DefaultAWSCredentialsProviderChain())
        .withRegion(Regions.EU_WEST_1.getName)
        .build()
      try {
        rm(outputPath)
        val buildInfo = WireBuildInfo("name", "starttime", "buildno", "revision", "vcsurl", "branch")
        val fos = new PrintWriter(new FileOutputStream(outputPath.toIO))
        try {
          upickle.default.writeTo(buildInfo, fos)
        } finally {
          fos.close()
        }
      } finally {
        client.shutdown()
      }
      PathRef(outputPath)
    }

    case class WireBuildInfo(
      projectName: String,
      startTime: String,
      buildNumber: String,
      revision: String,
      vcsURL: String,
      branch: String
    )
    object WireBuildInfo{
      implicit def rw: RW[WireBuildInfo] = macroRW
    }

    def riffRaffArtifact = T { createArtifact(assembly()) }
  }

}

object deps extends Module {

  val okhttp3 = ivy"com.squareup.okhttp3:okhttp:3.9.1"
  val logging = ivy"com.amazonaws:aws-lambda-java-log4j:1.0.0"
  val scalaz = ivy"org.scalaz::scalaz-core:7.2.18"
  val playJson = ivy"com.typesafe.play::play-json:2.6.9"
  val scalatest = ivy"org.scalatest::scalatest:3.0.1"

  val jacksonDatabind = ivy"com.fasterxml.jackson.core:jackson-databind:2.8.11.1"
  val awsS3 = ivy"com.amazonaws:aws-java-sdk-s3:1.11.311"
//  val awsSQS = "com.amazonaws" % "aws-java-sdk-sqs" % "1.11.371"
//  val awsSES = "com.amazonaws" % "aws-java-sdk-ses" % "1.11.379"
  val awsLambda = ivy"com.amazonaws:aws-lambda-java-core:1.2.0"
//  val supportInternationalisation = "com.gu" %% "support-internationalisation" % "0.9"

  val testInterface = ivy"org.scala-sbt:test-interface:1.0"
}

trait ScalaSettings extends SbtModule {

  def scalaVersion = "2.12.6"
  trait Tests2 extends Tests {
    override def moduleDeps = ScalaSettings.this.moduleDeps ++ Seq(ScalaSettings.this, lib.fudgetests)
    override def ivyDeps = ScalaSettings.this.ivyDeps() ++ Agg(deps.scalatest)
    def testFrameworks = Seq("com.gu.fudgetests.UnitTestsRunner")

  }
}

object lib extends Module {

  import deps._

  object fudgetests extends ScalaModule {

    def scalaVersion = "2.12.6"

    override def ivyDeps = Agg(deps.scalatest, deps.testInterface)
  }

  object restHttp extends ScalaSettings {
    override def ivyDeps = Agg(okhttp3, logging, scalaz, playJson)
    object test extends Tests2
  }

  object handler extends ScalaSettings {
    override def ivyDeps = Agg(okhttp3, logging, scalaz, playJson, scalatest, awsLambda, awsS3)
    object test extends Tests2
  }

  object effects extends ScalaSettings {
    override def moduleDeps = Seq(handler)
    override def ivyDeps = Agg(okhttp3, logging, scalaz, playJson, scalatest, awsS3, jacksonDatabind)
    object test extends Tests2
  }

  object zuora extends ScalaSettings {
    override def moduleDeps = Seq(handler, restHttp, lib.test.test, effects.test)
    override def ivyDeps = Agg(okhttp3, logging, scalaz, playJson, scalatest, jacksonDatabind)
    object test extends Tests2
  }

  object test extends ScalaSettings {
    object test extends Tests2 {
      override def ivyDeps = super.ivyDeps() ++ Agg(playJson)
    }
  }

}