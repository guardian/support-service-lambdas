package com.gu.google

import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.effects.S3Location
import com.gu.util.config.ConfigReads.ConfigFailure
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.JsObject

import scala.util.{Success, Try}

class BigQueryConfigTest extends AnyFlatSpec with Matchers {

  it should "parse a config file" in {
    def config(dummyLocation: S3Location): Try[String] = Success("""
        |  {
        |    "stage": "DEV",
        |    "bigQueryCredentials": {
        |      "type": "service_account",
        |      "project_id": "my-project",
        |      "client_id": "09876543",
        |      "client_email": "service-account@my-project.iam.gserviceaccount.com",
        |      "private_key": "-----BEGIN PRIVATE KEY-----\nblah\n-----END PRIVATE KEY-----\n",
        |      "private_key_id": "12345678"
        |    }
        |  }
        |""".stripMargin)

    val loadConfig = LoadConfigModule(Stage("DEV"), config)
    val maybeConfig = loadConfig.load[BigQueryConfig]
    maybeConfig match {
      case Left(error) => fail(error.toString)
      case Right(config) =>
        config.bigQueryCredentials shouldBe a[JsObject]
        (config.bigQueryCredentials \ "project_id").as[String] shouldBe "my-project"
    }
  }

  it should "fail to parse an invalid config file" in {
    def config(dummyLocation: S3Location): Try[String] = Success("""
        |  {
        |    "stage": "DEV",
        |    "bigQueryCredentials": 4
        |  }
        |""".stripMargin)

    val loadConfig = LoadConfigModule(Stage("DEV"), config)
    val maybeConfig = loadConfig.load[BigQueryConfig]
    maybeConfig match {
      case Left(error) =>
        error shouldBe a[ConfigFailure]
      case Right(_) =>
        fail("BigQueryConfig should not parse")
    }
  }
}
