package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{ActivePaymentMethod, CreditCard, NotActivePaymentMethod, PaymentMethod, PaymentMethodStatus}
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
  it should "fail if payment method is not active" in {
    val paymentMethod = PaymentMethod(NotActivePaymentMethod, CreditCard)
    def getPaymentMethodStatus = fakeGetPaymentMethodStatus(ClientSuccess(paymentMethod)) _
    ValidatePaymentMethod(getPaymentMethodStatus)(PaymentMethodId("paymentMethodId")).shouldBe(validationError("Default payment method status in Zuora account is not active"))
  }

  it should "succeed if payment method is active" in {
    val paymentMethod = PaymentMethod(ActivePaymentMethod, CreditCard)

    def getPaymentMethodStatus = fakeGetPaymentMethodStatus(ClientSuccess(paymentMethod)) _
    ValidatePaymentMethod(getPaymentMethodStatus)(PaymentMethodId("paymentMethodId")) shouldBe ContinueProcessing(())
  }

  it should "return error if zuora call fails" in {
    def getPaymentMethodStatus(id: PaymentMethodId) = GenericError("zuora error")
    ValidatePaymentMethod(getPaymentMethodStatus)(PaymentMethodId("paymentMethodId")) shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some log message"))
  }

}
