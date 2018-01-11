package com.gu.stripeCustomerSourceUpdated

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import StripeSignatureChecker._
import com.gu.TestData
import org.joda.time.DateTime

class StripeSignatureCheckerTest extends FlatSpec {

  "verifySignature" should "fail if the signature is nonsense" in {
    val badHeaders = headersWithStripeSignature("1513759648", "longAlphanumericString")

    //when
    val signatureCheckPassed = verifyStripeSignature(stripeConfig = TestData.fakeStripeConfig, headers = badHeaders, payload = someBody)

    signatureCheckPassed shouldBe (false)
  }

  it should "succeed if the secret key is correct" in {
    val nowInSeconds = (DateTime.now().getMillis / 1000).toString

    val sigJava = makeExpectedSignature(nowInSeconds, someBody, TestData.fakeStripeConfig.ukStripeSecretKey.key)
    val headers = headersWithStripeSignature(nowInSeconds, sigJava)

    //when
    val signatureCheckPassed = verifyStripeSignature(stripeConfig = TestData.fakeStripeConfig, headers = headers, payload = someBody)

    signatureCheckPassed shouldBe (true)
  }

  it should "still work if signature made using AU secret key" in {
    val nowInSeconds = (DateTime.now().getMillis / 1000).toString

    val sigJava = makeExpectedSignature(nowInSeconds, someBody, TestData.fakeStripeConfig.auStripeSecretKey.key)
    val headers = headersWithStripeSignature(nowInSeconds, sigJava)

    //when
    val signatureCheckPassed = verifyStripeSignature(stripeConfig = TestData.fakeStripeConfig, headers = headers, payload = someBody)

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
    "SomeHeader1" -> "testvalue",
    "Content-Type" -> "application/json",
    "Stripe-Signature" -> s"t=$timestamp,v1=$signature"
  )

  def makeExpectedSignature(timestamp: String, payload: String, secretKey: String) = {
    val signedPayload = s"$timestamp.$payload"

    val hasher = Mac.getInstance("HmacSHA256")
    hasher.init(new SecretKeySpec(secretKey.getBytes("UTF8"), "HmacSHA256"))
    val hash: Array[Byte] = hasher.doFinal(signedPayload.getBytes("UTF8"))

    var result = ""
    for (b <- hash) {
      result += Integer.toString((b & 0xff) + 0x100, 16).substring(1)
    }
    result
  }
}
