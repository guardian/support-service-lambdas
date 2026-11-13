package com.gu.autoCancel

import org.scalatest.flatspec.AnyFlatSpec
object AutoCancelInputFilterTest {

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
class AutoCancelInputFilterTest extends AnyFlatSpec {

  import AutoCancelInputFilterTest._
  import AutoCancelInputFilter._

  "filterInvalidAccount" should "return a left if AutoPay = false" in {
    val autoCancelCallout = fakeCallout(false)
    val apiGatewayOp = apply(autoCancelCallout)
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
    val apiGatewayOp = apply(autoCancelCallout)
    assert(
      apiGatewayOp.toDisjunction match {
        case Right(_) => true
        case _ => false
      },
      s"We got: $apiGatewayOp",
    )
  }

}
