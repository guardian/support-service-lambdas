package com.gu.paymentFailure

import com.gu.TestData.fakeApiConfig
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import org.scalatest.{FlatSpec, Matchers}

import scalaz.\/

class PaymentFailureStepsTest extends FlatSpec with Matchers {

  "validate tenant" should "fail if it's wrong" in {

    val actualWrongTenantId = "wrong"

    val expected = \/.left(unauthorized)
    val result = PaymentFailureSteps.validateTenantCallout(fakeApiConfig)(actualWrongTenantId)

    result.toDisjunction should be(expected)
  }

}
