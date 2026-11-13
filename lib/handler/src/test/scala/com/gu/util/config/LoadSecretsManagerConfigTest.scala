package com.gu.util.config

import com.gu.util.config.ConfigReads.ConfigFailure
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{Json, Reads}

import scala.util.{Failure, Success}

class LoadSecretsManagerConfigTest extends AnyFlatSpec with Matchers with EitherValues {
  case class TestConfig(clientId: String, clientSecret: String)
  object TestConfig {
    implicit val reads: Reads[TestConfig] = Json.reads[TestConfig]
    implicit val location: SecretLocation[TestConfig] = SecretLocation("application/oauth")
  }

  List("CODE", "PROD", "CSBX").foreach { stage =>
    "LoadSecretsManagerConfig" should s"load typed configuration from the $stage secret without a stage field" in {
      val loader = LoadSecretsManagerConfig(
        Stage(stage),
        secretId => {
          secretId shouldBe s"$stage/application/oauth"
          Success("""{"clientId":"test-client","clientSecret":"test-secret"}""")
        },
      )

      loader.load[TestConfig] shouldBe Right(TestConfig("test-client", "test-secret"))
    }
  }

  it should "report a read failure without including the underlying exception's potentially sensitive message" in {
    val loader = LoadSecretsManagerConfig(
      Stage("CODE"),
      _ => Failure(new IllegalStateException("must-not-be-logged")),
    )

    loader.load[TestConfig] shouldBe Left(
      ConfigFailure("Failed to read secret CODE/application/oauth (IllegalStateException)"),
    )
  }

  it should "report malformed JSON without including the secret contents" in {
    val loader = LoadSecretsManagerConfig(
      Stage("CODE"),
      _ => Success("""{"clientId":"must-not-be-logged","clientSecret":"""),
    )

    loader.load[TestConfig] shouldBe Left(ConfigFailure("Secret CODE/application/oauth is not valid JSON"))
  }

  List(
    "a missing field" -> """{"clientId":"must-not-be-logged"}""",
    "a field of the wrong type" -> """{"clientId":"must-not-be-logged","clientSecret":123}""",
  ).foreach { case (description, json) =>
    it should s"report $description without including credential values" in {
      val loader = LoadSecretsManagerConfig(Stage("CODE"), _ => Success(json))

      val error = loader.load[TestConfig].left.value.error
      error should include("CODE/application/oauth")
      error should include("/clientSecret")
      error should not include "must-not-be-logged"
    }
  }
}
