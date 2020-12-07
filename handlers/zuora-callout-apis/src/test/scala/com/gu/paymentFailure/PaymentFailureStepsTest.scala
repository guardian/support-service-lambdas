package com.gu.paymentFailure

import com.gu.TestData.fakeApiConfig
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PaymentFailureStepsTest extends AnyFlatSpec with Matchers {

  "validate tenant" should "fail if it's wrong" in {

    val actualWrongTenantId = "wrong"

    val expected = Left(unauthorized)
    val result = PaymentFailureSteps.validateTenantCallout(fakeApiConfig)(actualWrongTenantId)

    result.toDisjunction should be(expected)
  }

}
