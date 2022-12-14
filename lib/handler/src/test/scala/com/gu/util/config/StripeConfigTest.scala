package com.gu.util.config

import play.api.libs.json.{JsSuccess, Json}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class StripeConfigTest extends AnyFlatSpec with Matchers {
  // Stripe specific tests
  it should "the sig verified status is on by default" in {
    val configString = """{
                         |     "customerSourceUpdatedWebhook": {
                         |       "api.key.secret": "abc",
                         |       "au-membership.key.secret": "def"
                         |     }
                         |  }""".stripMargin
    val actualConfigObject = Json.fromJson[StripeConfig](Json.parse(configString))
    actualConfigObject should be(
      JsSuccess(
        StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true),
      ),
    )
  }

  it should "sig verifying is on if we ask for it to be on" in {
    val configString = """{
                         |     "customerSourceUpdatedWebhook": {
                         |       "api.key.secret": "abc",
                         |       "au-membership.key.secret": "def"
                         |     },
                         |     "signatureChecking": "true"
                         |  }""".stripMargin
    val actualConfigObject = Json.fromJson[StripeConfig](Json.parse(configString))
    actualConfigObject should be(
      JsSuccess(
        StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true),
      ),
    )
  }

  it should "sig verifying is still on if we ask for sdjfkhgsdf" in {
    val configString = """{
                         |     "customerSourceUpdatedWebhook": {
                         |       "api.key.secret": "abc",
                         |       "au-membership.key.secret": "def"
                         |     },
                         |     "signatureChecking": "sdfjhgsdf"
                         |  }""".stripMargin
    val actualConfigObject = Json.fromJson[StripeConfig](Json.parse(configString))
    actualConfigObject should be(
      JsSuccess(
        StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true),
      ),
    )
  }

  it should "sig verifying is ONLY off if we ask for false" in {
    val configString = """{
                         |     "customerSourceUpdatedWebhook": {
                         |       "api.key.secret": "abc",
                         |       "au-membership.key.secret": "def"
                         |     },
                         |     "signatureChecking": "false"
                         |  }""".stripMargin
    val actualConfigObject = Json.fromJson[StripeConfig](Json.parse(configString))
    actualConfigObject should be(
      JsSuccess(
        StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), false),
      ),
    )
  }
}
