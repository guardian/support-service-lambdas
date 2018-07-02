package com.gu.util.config2

import com.amazonaws.services.s3.model.GetObjectRequest
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.Stage
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json
import scalaz.{-\/, \/-}

import scala.util.Try

class LoadConfig2Test extends FlatSpec with Matchers {

  def fakeS3Load(responsesForStage: Map[String, String])(req: GetObjectRequest): Try[String] = Try {
    if (req.getBucketName != "gu-reader-revenue-private") throw (new RuntimeException(s"test failed: unexpected bucket name ${req.getBucketName}"))
    if (req.getKey == "membership/payment-failure-lambdas/PROD/someDir/filename.v2.json") responsesForStage("PROD")
    else if (req.getKey == "membership/payment-failure-lambdas/DEV/someDir/filename.v2.json") responsesForStage("DEV")
    else
      throw (new RuntimeException(s"test failed unexpected key ${req.getKey}"))
  }

  val prodStage = Stage("PROD")

  case class TestConfig(someValue: String, someOtherValue: Int)

  object TestConfig {
    implicit val reads = Json.reads[TestConfig]
    implicit val location = ConfigLocation[TestConfig](path = "someDir/filename.json", version = 2)
  }

  it should "be able to load config successfully with version" in {

    def prodS3Load = fakeS3Load(Map("PROD" -> prodJson)) _

    val prodConfig = LoadConfig2(prodStage, prodS3Load)

    prodConfig[TestConfig] shouldBe \/-(TestConfig("prodValue", 92))

  }
  it should "fail if the configuration is invalid json" in {

    def invalidJsonLoad = fakeS3Load(Map("PROD" -> "hello world")) _

    val prodConfig = LoadConfig2(prodStage, invalidJsonLoad)

    prodConfig[TestConfig].isLeft shouldBe(true)
  }

  it should "fail if the stage in the config file differs from the expected stage provided" in {

    //note this will return the dev json when asking for the prod stage
    def wrongFileS3Load = fakeS3Load(Map("PROD" -> devJSon)) _

    val prodConfig = LoadConfig2(prodStage, wrongFileS3Load)

    prodConfig[TestConfig] shouldBe -\/(ConfigFailure("Expected to load PROD config, but loaded DEV config"))
  }

  it should "fail if the no stage variable in configuration file" in {

    val noStageConfig =
      """{
        |  "someValue": "prodValue",
        |  "someOtherValue" : 92
        |  }
      """.stripMargin
    def noStageS3Load = fakeS3Load(Map("PROD" -> noStageConfig)) _

    val prodConfig = LoadConfig2(prodStage, noStageS3Load)

    prodConfig[TestConfig].isLeft shouldBe(true)
  }

  it should "fail if the no stage variable in configuration file is not a string" in {

    val noStageConfig =
      """{
        |   "stage" : 134
        |  "someValue": "prodValue",
        |  "someOtherValue" : 92
        |  }
      """.stripMargin
    def invalidStageS3Load = fakeS3Load(Map("PROD" -> noStageConfig)) _

    val prodConfig = LoadConfig2(prodStage, invalidStageS3Load)

    prodConfig[TestConfig].isLeft shouldBe(true)
  }

  val prodJson: String =
    """
      |{ "stage": "PROD",
      |  "someValue": "prodValue",
      |  "someOtherValue" : 92
      |}
    """.stripMargin

  val devJSon: String =
    """
      |{ "stage": "DEV",
      |  "someValue": "devValue",
      |  "someOtherValue" : 93
      |}
    """.stripMargin

}