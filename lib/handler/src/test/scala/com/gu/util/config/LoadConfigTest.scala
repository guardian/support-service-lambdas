package com.gu.util.config

import com.gu.util.config.ETConfig.{ETSendId, ETSendIds}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsSuccess, Json}
import scalaz.\/-

class LoadConfigTest extends FlatSpec with Matchers {

  "loader" should "be able to load config successfully" in {
    val actualConfigObject = LoadConfig.parseConfig[String](devConfig)
    actualConfigObject should be(\/-(
      Config(
        Stage("DEV"),
        TrustedApiConfig("b", "c"),
        stepsConfig = "hi",
        etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("111"), ETSendId("222"), ETSendId("333"), ETSendId("444"), ETSendId("ccc")), clientId = "jjj", clientSecret = "kkk"),
        stripeConfig = StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true)
      )
    ))
  }

  "loader" should "succeed if the stage from the environment matches the stage in the config file" in {
    val confAttempt = LoadConfig.default[String](implicitly)(Stage("DEV"), \/-(devConfig), true)
    assert(confAttempt.isRight)
  }

  "loader" should "succeed if the config comparison is overridden, regardless of whether the stages match" in {
    val confAttempt = LoadConfig.default[String](implicitly)(Stage("PROD"), \/-(devConfig), false)
    assert(confAttempt.isRight)
  }

  "loader" should "fail if the stages from the environment and the config file do not match, and the safety check is configured" in {
    val confAttempt = LoadConfig.default[String](implicitly)(Stage("PROD"), \/-(devConfig), true)
    assert(confAttempt.isLeft)
  }

  // Stripe specific tests
  "loader" should "the sig verified status is on by default" in {
    val configString = """{
                         |     "customerSourceUpdatedWebhook": {
                         |       "api.key.secret": "abc",
                         |       "au-membership.key.secret": "def"
                         |     }
                         |  }""".stripMargin
    val actualConfigObject = Json.fromJson[StripeConfig](Json.parse(configString))
    actualConfigObject should be(JsSuccess(
      StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true)
    ))
  }

  "loader" should "sig verifying is on if we ask for it to be on" in {
    val configString = """{
                         |     "customerSourceUpdatedWebhook": {
                         |       "api.key.secret": "abc",
                         |       "au-membership.key.secret": "def"
                         |     },
                         |     "signatureChecking": "true"
                         |  }""".stripMargin
    val actualConfigObject = Json.fromJson[StripeConfig](Json.parse(configString))
    actualConfigObject should be(JsSuccess(
      StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true)
    ))
  }

  "loader" should "sig verifying is still on if we ask for sdjfkhgsdf" in {
    val configString = """{
                         |     "customerSourceUpdatedWebhook": {
                         |       "api.key.secret": "abc",
                         |       "au-membership.key.secret": "def"
                         |     },
                         |     "signatureChecking": "sdfjhgsdf"
                         |  }""".stripMargin
    val actualConfigObject = Json.fromJson[StripeConfig](Json.parse(configString))
    actualConfigObject should be(JsSuccess(
      StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true)
    ))
  }

  "loader" should "sig verifying is ONLY off if we ask for false" in {
    val configString = """{
                         |     "customerSourceUpdatedWebhook": {
                         |       "api.key.secret": "abc",
                         |       "au-membership.key.secret": "def"
                         |     },
                         |     "signatureChecking": "false"
                         |  }""".stripMargin
    val actualConfigObject = Json.fromJson[StripeConfig](Json.parse(configString))
    actualConfigObject should be(JsSuccess(
      StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), false)
    ))
  }

  val devConfig: String =
    """
      |{ "stage": "DEV",
      |  "trustedApiConfig": {
      |    "apiClientId": "a",
      |    "apiToken": "b",
      |    "tenantId": "c"
      |  },
      |  "stepsConfig": "hi",
      |  "etConfig": {
      |    "etSendIDs":
      |    {
      |      "pf1": "111",
      |      "pf2": "222",
      |      "pf3": "333",
      |      "pf4": "444",
      |      "cancelled": "ccc"
      |    },
      |    "clientId": "jjj",
      |    "clientSecret": "kkk"
      |  },
      |  "stripe": {
      |     "customerSourceUpdatedWebhook": {
      |       "api.key.secret": "abc",
      |       "au-membership.key.secret": "def"
      |     }
      |  }
      |}
    """.stripMargin

}
