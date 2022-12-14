package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.NonDirectDebitMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.{ActivePaymentMethod, NotActivePaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.{CreditCard, Other}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ValidatePaymentMethodTest extends AnyFlatSpec with Matchers {
  val paymentMethodId = PaymentMethodId("paymentMethodId")
  it should "fail if payment method is not active" in {
    val inactivePaymentMethod = NonDirectDebitMethod(NotActivePaymentMethod, CreditCard)
    ValidatePaymentMethod(inactivePaymentMethod).shouldBe(
      Failed("Default payment method status in Zuora account is not active"),
    )
  }

  it should "succeed if payment method is active" in {
    val validPaymentMethod = NonDirectDebitMethod(ActivePaymentMethod, CreditCard)
    ValidatePaymentMethod(validPaymentMethod) shouldBe Passed((validPaymentMethod))
  }

  it should "fail if payment method is of an unknown type" in {
    val unknownTypePaymentMethod = NonDirectDebitMethod(ActivePaymentMethod, Other)
    val validPaymentTypes = PaymentMethodType.all.filterNot(_ == Other)
    val expectedMessage =
      s"Invalid payment method type in Zuora account, must be one of ${validPaymentTypes.mkString(",")}"
    ValidatePaymentMethod(unknownTypePaymentMethod) shouldBe Failed(expectedMessage)
  }
}
