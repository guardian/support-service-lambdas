package com.gu.util

import com.gu.TestData
import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import com.gu.util.zuora.ZuoraRestConfig
import org.scalatest.{ FlatSpec, Matchers }
import play.api.libs.json.{ JsSuccess, Json }

import scala.util.Success

class ConfigLoaderTest extends FlatSpec with Matchers {

  "loader" should "be able to load config successfully" in {
    val actualConfigObject = Config.parseConfig(TestData.codeConfig)
    actualConfigObject should be(Success(
      Config(
        Stage("DEV"),
        TrustedApiConfig("b", "c"),
        zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
        etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("111"), ETSendId("222"), ETSendId("333"), ETSendId("444"), ETSendId("ccc")), clientId = "jjj", clientSecret = "kkk"),
        stripeConfig = StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true))))
  }

  "loader" should "the sig verified status is on by default" in {
    val configString = """{
                         |     "customerSourceUpdatedWebhook": {
                         |       "api.key.secret": "abc",
                         |       "au-membership.key.secret": "def"
                         |     }
                         |  }""".stripMargin
    val actualConfigObject = Json.fromJson[StripeConfig](Json.parse(configString))
    actualConfigObject should be(JsSuccess(
      StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true)))
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
      StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true)))
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
      StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), true)))
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
      StripeConfig(StripeWebhook(StripeSecretKey("abc"), StripeSecretKey("def")), false)))
  }

}
