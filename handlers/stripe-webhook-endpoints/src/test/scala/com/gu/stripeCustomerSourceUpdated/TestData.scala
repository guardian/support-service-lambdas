package com.gu.stripeCustomerSourceUpdated

import com.gu.effects.TestingRawEffects
import com.gu.util.config._
import com.gu.util.zuora.{ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.matchers.should.Matchers

object TestData extends Matchers {
  val fakeZuoraConfig = ZuoraRestConfig("https://ddd", "fakeUser", "fakePass")
  val fakeStripeConfig = StripeConfig(customerSourceUpdatedWebhook = StripeWebhook(StripeSecretKey("ukCustomerSourceUpdatedSecretKey"), StripeSecretKey("auCustomerSourceUpdatedStripeSecretKey")), true)

  val missingCredentialsResponse =
    """{
       |"statusCode":"401",
       |"headers":{"Content-Type":"application/json"},
       |"body":"{\n  \"message\" : \"Credentials are missing or invalid\"\n}"
       |}
       |""".stripMargin

  val successfulResponse =
    """{
       |"statusCode":"200",
       |"headers":{"Content-Type":"application/json"},
       |"body":"{\n  \"message\" : \"Success\"\n}"
       |}
       |""".stripMargin

  def zuoraDeps(effects: TestingRawEffects) = ZuoraRestRequestMaker(effects.response, TestData.fakeZuoraConfig)
  val stripeDeps = StripeDeps(TestData.fakeStripeConfig, new StripeSignatureChecker)

}
