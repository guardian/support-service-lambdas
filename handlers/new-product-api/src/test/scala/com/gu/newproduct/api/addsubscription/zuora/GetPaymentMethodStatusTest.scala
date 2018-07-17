package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodStatus.{Active, Closed, PaymentMethodWire}
import com.gu.test.EffectsTest
import com.gu.util.zuora.RestRequestMaker.{ClientSuccess, GenericError, IsCheckNeeded}
import org.scalatest.{FlatSpec, Matchers}

class GetPaymentMethodStatusTest extends FlatSpec with Matchers {

  val fakeResponses = Map(
    "object/payment-method/activeAccountId" -> PaymentMethodWire("Active"),
    "object/payment-method/closedAccountId" -> PaymentMethodWire("Closed"),
    "object/payment-method/unexpected" -> PaymentMethodWire("unexpected"),
  )

  def fakeGet(path: String, skipCheck: IsCheckNeeded) = ClientSuccess(fakeResponses(path))

  it should "get active payment status" taggedAs EffectsTest in {

    val actual = for {
     res <- GetPaymentMethodStatus(fakeGet)(PaymentMethodId("activeAccountId"))
    } yield {
      res
    }
    actual shouldBe ClientSuccess(Active)
  }

  it should "get closed payment status" taggedAs EffectsTest in {
    val actual = for {
      res <- GetPaymentMethodStatus(fakeGet)(PaymentMethodId("closedAccountId"))
    } yield {
      res
    }
    actual shouldBe ClientSuccess(Closed)
  }

  it should "return failure if payment method is unexpected value" taggedAs EffectsTest in {
    val actual = for {
      res <- GetPaymentMethodStatus(fakeGet)(PaymentMethodId("unexpected"))
    } yield {
      res
    }
    actual shouldBe GenericError("Unknown payment method status: 'unexpected'")
  }

}

