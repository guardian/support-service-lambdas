package com.gu.stripeCustomerSourceUpdated

import com.gu.stripeCustomerSourceUpdated.StripeRequestSignatureChecker.verifyRequest
import com.gu.util.config.{StripeConfig, StripeSecretKey}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers._

class StripeRequestSignatureCheckerTest extends AnyFlatSpec {

  val testSignatureHelper = new FakeStripeSignatureChecker(TestData.fakeStripeConfig)
  val testStripeDeps = StripeDeps(TestData.fakeStripeConfig, testSignatureHelper)

  "verifySignature" should "fail if the signature is nonsense" in {
    val nonsense = "longAlphanumericString"
    val badHeaders = headersWithStripeSignature("1513759648", nonsense)

    val signatureCheckPassed = verifyRequest(headers = badHeaders, payload = someBody, stripeDeps = testStripeDeps, stripeAccount = Some(StripeAccount.GNM_Membership_AUS))

    signatureCheckPassed shouldBe (false)
  }

  it should "fail if there are no headers" in {
    val signatureCheckPassed = verifyRequest(headers = Map(), payload = someBody, stripeDeps = testStripeDeps, stripeAccount = Some(StripeAccount.GNM_Membership_AUS))

    signatureCheckPassed shouldBe (false)
  }

  it should "call verify with a valid secret key" in {
    val nowInSeconds = (System.currentTimeMillis() / 1000).toString
    val headers = headersWithStripeSignature(nowInSeconds, "test signature")

    val signatureCheckPassed = verifyRequest(headers = headers, payload = someBody, stripeDeps = testStripeDeps, stripeAccount = Some(StripeAccount.GNM_Membership))

    signatureCheckPassed shouldBe (true)
  }

  it should "still work with the AU secret key" in {
    val nowInSeconds = (System.currentTimeMillis() / 1000).toString
    val headers = headersWithStripeSignature(nowInSeconds, "test signature")

    val signatureCheckPassed = verifyRequest(headers = headers, payload = someBody, stripeDeps = testStripeDeps, stripeAccount = Some(StripeAccount.GNM_Membership_AUS))

    signatureCheckPassed shouldBe (true)
  }

  val someBody =
    """
      |{
      |  "id": "evt_lettersAndNumbers",
      |  "data": {
      |    "object": {
      |      "id": "card_lettersAndNumbers",
      |      "object": "card",
      |      "brand": "Visa",
      |      "country": "US",
      |      "customer": "cus_lettersAndNumbers",
      |      "exp_month": 7,
      |      "exp_year": 2020,
      |      "fingerprint": "lettersAndNumbers",
      |      "funding": "credit",
      |      "last4": "1234",
      |      "name": null,
      |      "tokenization_method": null
      |    }
      |  },
      |  "livemode": true,
      |  "pending_webhooks": 1,
      |  "request": {
      |    "id": null,
      |    "idempotency_key": null
      |  },
      |  "type": "customer.source.updated"
      |}
    """.stripMargin

  def headersWithStripeSignature(timestamp: String, signature: String) = Map(
    "Stripe-Signature" -> s"t=$timestamp,v1=$signature"
  )

  class FakeStripeSignatureChecker(stripeConfig: StripeConfig) extends SignatureChecker {
    override def verifySignature(secretKey: StripeSecretKey, payload: String, signatureHeader: Option[String], tolerance: Long): Boolean = {
      val signatureHeaderWithoutTimestamp = signatureHeader map { header => header.split("v1=")(1) }
      (secretKey, payload, signatureHeaderWithoutTimestamp, tolerance) match {
        case (TestData.fakeStripeConfig.customerSourceUpdatedWebhook.auStripeSecretKey, _, Some("longAlphanumericString"), _) => false
        case (TestData.fakeStripeConfig.customerSourceUpdatedWebhook.ukStripeSecretKey, _, Some("test signature"), _) => true
        case (TestData.fakeStripeConfig.customerSourceUpdatedWebhook.auStripeSecretKey, _, Some("test signature"), _) => true
        case (_, _, _, _) => false
      }
    }
  }

}
