package com.gu.identityRetention

import com.gu.util.apigateway.{ApiGatewayResponse, URLParams}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class IdentityRetentionStepsTest extends FlatSpec with Matchers {

  it should "return a bad response if the identity id query string cannot be found" in {
    val result = IdentityRetentionSteps.extractIdentityId(Some(URLParams(None, false, None, false, false, None)))
    val expected = -\/(ApiGatewayResponse.badRequest)
    result should be(expected)
  }

  it should "return the identity id if it was included in a query string param" in {
    val result = IdentityRetentionSteps.extractIdentityId(Some(URLParams(None, false, None, false, false, Some("identityId123"))))
    val expected = \/-("identityId123")
    result should be(expected)
  }

}
