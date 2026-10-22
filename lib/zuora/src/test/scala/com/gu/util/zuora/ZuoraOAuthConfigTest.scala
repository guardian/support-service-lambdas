package com.gu.util.zuora

import com.gu.util.config.{LoadSecretsManagerConfig, Stage}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import scala.util.Success

class ZuoraOAuthConfigTest extends AnyFlatSpec with Matchers {
  List("CODE", "PROD", "CSBX").foreach { stage =>
    "ZuoraOAuthConfig" should s"load the shared $stage OAuth secret with the same shape as the TypeScript client" in {
      val loader = LoadSecretsManagerConfig(
        Stage(stage),
        secretId => {
          secretId shouldBe s"$stage/Zuora-OAuth/SupportServiceLambdas"
          Success("""{"clientId":"test-client","clientSecret":"test-secret"}""")
        },
      )

      loader.load[ZuoraOAuthConfig] shouldBe Right(ZuoraOAuthConfig("test-client", "test-secret"))
    }
  }

  List(
    "PROD" -> "https://rest.zuora.com",
    "CSBX" -> "https://rest.test.zuora.com",
    "CODE" -> "https://rest.apisandbox.zuora.com",
    "DEV" -> "https://rest.apisandbox.zuora.com",
  ).foreach { case (stage, expectedUrl) =>
    "serverUrl" should s"match the TypeScript client's endpoint for $stage" in {
      ZuoraOAuthConfig.serverUrl(stage) shouldBe expectedUrl
    }
  }
}
