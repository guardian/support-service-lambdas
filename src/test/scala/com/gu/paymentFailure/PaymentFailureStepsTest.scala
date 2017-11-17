package com.gu.paymentFailure

import com.gu.TestData.{ be, fakeApiConfig }
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import org.scalatest.{ FlatSpec, Matchers }

import scalaz.\/

class PaymentFailureStepsTest extends FlatSpec with Matchers {

  "validate tenant" should "fail if it's wrong" in {

    val actualWrongTenantId = "wrong"

    val expected = \/.left(unauthorized)
    val result = PaymentFailureSteps.validateTenantCallout(actualWrongTenantId).run(fakeApiConfig)

    result should be(expected)
  }

}
