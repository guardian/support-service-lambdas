package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.PaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.{ActivePaymentMethod, NotActivePaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.{CreditCard, Other}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import org.scalatest.{FlatSpec, Matchers}

class ValidatePaymentMethodTest extends FlatSpec with Matchers {

  def validationError(msg: String) = ReturnWithResponse(ApiGatewayResponse.messageResponse(statusCode = "422", message = msg))

  def fakeGetPaymentMethodStatus(response: ClientFailableOp[PaymentMethod])(id: PaymentMethodId) = {
    id.value shouldBe "paymentMethodId"
    response

  }

  val paymentMethodId = PaymentMethodId("paymentMethodId")
  it should "fail if payment method is not active" in {
    val paymentMethod = PaymentMethod(NotActivePaymentMethod, CreditCard)
    def getPaymentMethodStatus = fakeGetPaymentMethodStatus(ClientSuccess(paymentMethod)) _
    val expectedMessage = "Default payment method status in Zuora account is not active"
    ValidatePaymentMethod(getPaymentMethodStatus)(paymentMethodId).shouldBe(validationError(expectedMessage))
  }

  it should "succeed if payment method is active" in {
    val paymentMethod = PaymentMethod(ActivePaymentMethod, CreditCard)

    def getPaymentMethodStatus = fakeGetPaymentMethodStatus(ClientSuccess(paymentMethod)) _
    ValidatePaymentMethod(getPaymentMethodStatus)(paymentMethodId) shouldBe ContinueProcessing(())
  }

  it should "return error if zuora call fails" in {
    def getPaymentMethodStatus(id: PaymentMethodId) = GenericError("zuora error")
    val internalServerError = ReturnWithResponse(ApiGatewayResponse.internalServerError("some log message"))
    ValidatePaymentMethod(getPaymentMethodStatus)(paymentMethodId) shouldBe internalServerError
  }

  it should "fail if payment method is of an unknown type" in {
    val paymentMethod = PaymentMethod(ActivePaymentMethod, Other)
    def getPaymentMethodStatus = fakeGetPaymentMethodStatus(ClientSuccess(paymentMethod)) _
    val validPaymentTypes = PaymentMethodType.all.filterNot(_ == Other)
    val expectedMessage = s"Invalid payment method type in Zuora account, must be one of ${validPaymentTypes.mkString(",")}"
    ValidatePaymentMethod(getPaymentMethodStatus)(paymentMethodId) shouldBe validationError(expectedMessage)
  }
}
