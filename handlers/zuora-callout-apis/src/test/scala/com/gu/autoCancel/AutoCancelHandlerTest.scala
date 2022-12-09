package com.gu.autoCancel

import com.gu.autoCancel.AutoCancelSteps.AutoCancelUrlParams
import org.scalatest._
import play.api.libs.json.{JsSuccess, Json}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
object AutoCancelHandlerTest {

  def fakeCallout(autoPay: Boolean) = {
    AutoCancelCallout(
      accountId = "id123",
      autoPay = s"$autoPay",
      paymentMethodType = "PayPal",
      email = Some("hi@hi.com"),
      firstName = "john",
      lastName = "bloggs",
      creditCardType = "",
      creditCardExpirationMonth = "",
      creditCardExpirationYear = "",
      invoiceId = "idid",
      currency = "GBP",
      sfContactId = "1000000",
    )
  }

}
class AutoCancelHandlerTest extends AnyFlatSpec {

  import AutoCancelHandlerTest._
  import AutoCancelInputFilter._

  "filterInvalidAccount" should "return a left if AutoPay = false" in {
    val autoCancelCallout = fakeCallout(false)
    val apiGatewayOp = apply(autoCancelCallout, false)
    assert(
      apiGatewayOp.toDisjunction match {
        case Left(_) => true
        case _ => false
      },
      s"We got: $apiGatewayOp",
    )
  }

  "filterInvalidAccount" should "return a right if AutoPay = true" in {
    val autoCancelCallout = fakeCallout(true)
    val apiGatewayOp = apply(autoCancelCallout, false)
    assert(
      apiGatewayOp.toDisjunction match {
        case Right(_) => true
        case _ => false
      },
      s"We got: $apiGatewayOp",
    )
  }

  "filterDirectDebit" should "return a left if we're only cancelling direct debits, but the sub isn't paid that way" in {
    val apiGatewayOp = filterDirectDebit(onlyCancelDirectDebit = true, nonDirectDebit = true)
    assert(
      apiGatewayOp.toDisjunction match {
        case Left(_) => true
        case _ => false
      },
      s"We got: $apiGatewayOp",
    )
  }

  "filterDirectDebit" should "return a right if we're not just cancelling direct debits even if it's not paid by DD" in {
    val apiGatewayOp = filterDirectDebit(onlyCancelDirectDebit = false, nonDirectDebit = true)
    assert(
      apiGatewayOp.toDisjunction match {
        case Right(_) => true
        case _ => false
      },
      s"We got: $apiGatewayOp",
    )
  }

  "filterDirectDebit" should "return a right if we're only cancelling DDs and it is a direct debit" in {
    val apiGatewayOp = filterDirectDebit(onlyCancelDirectDebit = true, nonDirectDebit = false)
    assert(
      apiGatewayOp.toDisjunction match {
        case Right(_) => true
        case _ => false
      },
      s"We got: $apiGatewayOp",
    )
  }

}

class DeserialiserTest extends AnyFlatSpec with Matchers {

  "deserialise UrlParams" should "manage without the only direct debit param" in {
    val json = """{"apiToken": "a", "apiClientId": "b"}"""

    Json.parse(json).validate[AutoCancelUrlParams] should be(JsSuccess(AutoCancelUrlParams(false, false)))
  }

  it should "manage with the only direct debit param being false" in {
    val json = """{"apiToken": "a", "apiClientId": "b", "onlyCancelDirectDebit": "false"}"""

    Json.parse(json).validate[AutoCancelUrlParams] should be(JsSuccess(AutoCancelUrlParams(false, false)))
  }

  it should "manage with the only direct debit param being true" in {
    val json = """{"apiToken": "a", "apiClientId": "b", "onlyCancelDirectDebit": "true", "dryRun": "true"}"""

    Json.parse(json).validate[AutoCancelUrlParams] should be(JsSuccess(AutoCancelUrlParams(true, true)))
  }

}
