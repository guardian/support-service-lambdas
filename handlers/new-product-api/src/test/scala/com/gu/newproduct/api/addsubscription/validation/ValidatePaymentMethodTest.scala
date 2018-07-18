package com.gu.newproduct.api.addsubscription.validation

import com.gu.newproduct.api.addsubscription.zuora.GetAccount._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodStatus.{Active, Closed, PaymentMethodStatus}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import org.scalatest.{FlatSpec, Matchers}

class ValidatePaymentMethodTest extends FlatSpec with Matchers {

  def validationError(msg: String) = ReturnWithResponse(ApiGatewayResponse.messageResponse(statusCode = "422", message = msg))

  def fakeGetPaymentMethodStatus(response: ClientFailableOp[PaymentMethodStatus])(id: PaymentMethodId) = {
    if (id.value == "paymentMethodId")
      response
    else
      throw new RuntimeException(s"test error: unexpected payment method id: expected 'paymentMethodId' got ${id.value}")
  }
  it should "fail if payment method is not active" in {
    def getPaymentMethodStatus = fakeGetPaymentMethodStatus(ClientSuccess(Closed)) _
    ValidatePaymentMethod(getPaymentMethodStatus)(PaymentMethodId("paymentMethodId")) shouldBe validationError("Default payment method status in Zuora account is not active")
  }

  it should "succeed if payment method is active" in {
    def getPaymentMethodStatus = fakeGetPaymentMethodStatus(ClientSuccess(Active)) _
    ValidatePaymentMethod(getPaymentMethodStatus)(PaymentMethodId("paymentMethodId")) shouldBe ContinueProcessing(())
  }

  it should "return error if zuora call fails" in {
    def getPaymentMethodStatus(id: PaymentMethodId) = GenericError("zuora error")
    ValidatePaymentMethod(getPaymentMethodStatus)(PaymentMethodId("paymentMethodId")) shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some log message"))
  }

}
