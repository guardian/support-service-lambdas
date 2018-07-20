package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{PaymentMethod, PaymentMethodWire}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.{ActivePaymentMethod, NotActivePaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType._
import com.gu.test.EffectsTest
import com.gu.util.resthttp.RestRequestMaker.IsCheckNeeded
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import org.scalatest.{FlatSpec, Matchers}

class GetPaymentMethodTest extends FlatSpec with Matchers {

  def fakeGet(response: ClientFailableOp[PaymentMethodWire])(path: String, skipCheck: IsCheckNeeded) = {
    path shouldBe "object/payment-method/accountId"
    response
  }

  "GetPaymentMethod" should "return paymentMethod on success" taggedAs EffectsTest in {
    def get = fakeGet(response = ClientSuccess(PaymentMethodWire("Active", "CreditCard"))) _
    val actual = GetPaymentMethod(get)(PaymentMethodId("accountId"))
    actual shouldBe ClientSuccess(PaymentMethod(ActivePaymentMethod, CreditCard))
  }

  it should "return error on api call failure" taggedAs EffectsTest in {
    def get = fakeGet(response = GenericError("something failed!")) _
    val actual = GetPaymentMethod(get)(PaymentMethodId("accountId"))
    actual shouldBe GenericError("something failed!")
  }

  "paymentMethodWires.toPayMentMethod" should "convert PayPal payment" in {
    PaymentMethodWire("Active", "PayPal").toPaymentMethod shouldBe PaymentMethod(ActivePaymentMethod, PayPal)
  }
  it should "convert credit card payment" in {
    PaymentMethodWire("Active", "CreditCard").toPaymentMethod shouldBe PaymentMethod(ActivePaymentMethod, CreditCard)
  }
  it should "convert credit card reference payment" in {
    PaymentMethodWire("Active", "CreditCardReferenceTransaction").toPaymentMethod shouldBe PaymentMethod(ActivePaymentMethod, CreditCardReferenceTransaction)
  }
  it should "convert bank transfer payment" in {
    PaymentMethodWire("Active", "BankTransfer").toPaymentMethod shouldBe PaymentMethod(ActivePaymentMethod, BankTransfer)
  }

  it should "convert any other payment type to 'Other'" in {
    PaymentMethodWire("Active", "some other payment method").toPaymentMethod shouldBe PaymentMethod(ActivePaymentMethod, Other)
  }

  it should "convert any payment status other than active to 'NotActive'" in {
    PaymentMethodWire("some unknown status", "some other payment method").toPaymentMethod shouldBe PaymentMethod(NotActivePaymentMethod, Other)
  }
}

