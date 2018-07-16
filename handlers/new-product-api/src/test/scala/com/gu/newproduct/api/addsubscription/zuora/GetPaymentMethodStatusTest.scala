package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodStatus.{Active, Closed, PaymentMethodWire}
import com.gu.test.EffectsTest
import com.gu.util.zuora.RestRequestMaker.GenericError
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class GetPaymentMethodStatusTest extends FlatSpec with Matchers {

  val fakeResponses = Map(
    "object/payment-method/activeAccountId" -> PaymentMethodWire("Active"),
    "object/payment-method/closedAccountId" -> PaymentMethodWire("Closed"),
    "object/payment-method/unexpected" -> PaymentMethodWire("unexpected"),
  )

  def fakeGet(path:String, skipCheck: Boolean) = \/-(fakeResponses(path))

  it should "get active payment status" taggedAs EffectsTest in {

    val actual = for {
     res <- GetPaymentMethodStatus(fakeGet)("activeAccountId")
    } yield {
      res
    }
    actual shouldBe \/-(Active)
  }

  it should "get closed payment status" taggedAs EffectsTest in {
    val actual = for {
      res <- GetPaymentMethodStatus(fakeGet)("closedAccountId")
    } yield {
      res
    }
    actual shouldBe \/-(Closed)
  }

  it should "return failure if payment method is unexpected value" taggedAs EffectsTest in {
    val actual = for {
      res <- GetPaymentMethodStatus(fakeGet)("unexpected")
    } yield {
      res
    }
    actual shouldBe -\/(GenericError("Unknown payment method status: 'unexpected'"))
  }

}

