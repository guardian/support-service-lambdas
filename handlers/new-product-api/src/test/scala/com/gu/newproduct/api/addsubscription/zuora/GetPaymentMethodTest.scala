package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.zuora.GetAccount.PaymentMethodId
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{
  BankAccountName,
  BankAccountNumberMask,
  DirectDebit,
  MandateId,
  NonDirectDebitMethod,
  PaymentMethodWire,
  SortCode,
}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.{ActivePaymentMethod, NotActivePaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType._
import com.gu.test.EffectsTest
import com.gu.util.resthttp.RestRequestMaker.IsCheckNeeded
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError, PaymentError}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetPaymentMethodTest extends AnyFlatSpec with Matchers {

  def fakeGet(response: ClientFailableOp[PaymentMethodWire])(path: String, skipCheck: IsCheckNeeded) = {
    path shouldBe "object/payment-method/accountId"
    response
  }

  "GetPaymentMethod" should "return paymentMethod on success" taggedAs EffectsTest in {
    def get = fakeGet(response = ClientSuccess(PaymentMethodWire("Active", "CreditCard"))) _

    val actual = GetPaymentMethod(get)(PaymentMethodId("accountId"))
    actual shouldBe ClientSuccess(NonDirectDebitMethod(ActivePaymentMethod, CreditCard))
  }

  it should "return error on api call failure" taggedAs EffectsTest in {
    def get = fakeGet(response = GenericError("something failed!")) _

    val actual = GetPaymentMethod(get)(PaymentMethodId("accountId"))
    actual shouldBe GenericError("something failed!")
  }

  "paymentMethodWires.toPaymentMethod" should "convert PayPal payment" in {
    PaymentMethodWire("Active", "PayPal").toPaymentMethod shouldBe ClientSuccess(
      NonDirectDebitMethod(ActivePaymentMethod, PayPal),
    )
  }
  it should "convert credit card payment" in {
    PaymentMethodWire("Active", "CreditCard").toPaymentMethod shouldBe ClientSuccess(
      NonDirectDebitMethod(ActivePaymentMethod, CreditCard),
    )
  }
  it should "convert credit card reference payment" in {
    val actual = PaymentMethodWire("Active", "CreditCardReferenceTransaction").toPaymentMethod
    actual shouldBe ClientSuccess(NonDirectDebitMethod(ActivePaymentMethod, CreditCardReferenceTransaction))
  }

  it should "convert valid bank transfer payment" in {
    val expectedPaymentMethod = DirectDebit(
      ActivePaymentMethod,
      BankAccountName("bankAccountName"),
      BankAccountNumberMask("accountNumberMask"),
      SortCode("sortCode"),
      MandateId("mandateId"),
    )
    validDirectDebitWire.toPaymentMethod shouldBe ClientSuccess(expectedPaymentMethod)
  }

  it should "return error if missing mandate Id in direct debit payment method" in {
    val noMandateMethod = validDirectDebitWire.copy(MandateID = None)
    noMandateMethod.toPaymentMethod shouldBe PaymentError("no MandateID in zuora direct debit")
  }
  it should "return error if missing account number mask in direct debit payment method" in {
    val noAccountNumberPaymentMethod = validDirectDebitWire.copy(BankTransferAccountNumberMask = None)
    noAccountNumberPaymentMethod.toPaymentMethod shouldBe PaymentError("no account number mask in zuora direct debit")
  }
  it should "return error if missing account name in direct debit payment method" in {
    val noAccountNamePaymentMethod = validDirectDebitWire.copy(BankTransferAccountName = None)
    noAccountNamePaymentMethod.toPaymentMethod shouldBe PaymentError("no account name in zuora direct debit")
  }
  it should "return error if missing sort code in direct debit payment method" in {
    val noSortCodePaymentMethod = validDirectDebitWire.copy(BankCode = None)
    noSortCodePaymentMethod.toPaymentMethod shouldBe PaymentError("no bank code in zuora direct debit")
  }
  it should "convert any other payment type to 'Other'" in {
    val wire = PaymentMethodWire("Active", "some other payment method")
    val expected = ClientSuccess(NonDirectDebitMethod(ActivePaymentMethod, Other))
    wire.toPaymentMethod shouldBe expected
  }

  it should "convert any payment status other than active to 'NotActive'" in {
    val wire = PaymentMethodWire("some unknown status", "anotherPaymentMethod")
    val expected = ClientSuccess(NonDirectDebitMethod(NotActivePaymentMethod, Other))
    wire.toPaymentMethod shouldBe expected
  }

  val validDirectDebitWire = PaymentMethodWire(
    PaymentMethodStatus = "Active",
    Type = "BankTransfer",
    MandateID = Some("mandateId"),
    BankTransferAccountName = Some("bankAccountName"),
    BankTransferAccountNumberMask = Some("accountNumberMask"),
    BankCode = Some("sortCode"),
  )
}
