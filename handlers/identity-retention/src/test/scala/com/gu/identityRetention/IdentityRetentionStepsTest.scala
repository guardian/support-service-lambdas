package com.gu.identityRetention

import com.gu.identityRetention.IdentityRetentionSteps.UrlParams
import com.gu.identityRetention.Types.IdentityId
import com.gu.util.apigateway.ApiGatewayResponse
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class IdentityRetentionStepsTest extends FlatSpec with Matchers {

  it should "return the identity id if it was included in a query string param" in {
    val result = IdentityRetentionSteps.extractIdentityId(UrlParams(identityId = "123"))
    val expected = \/-(IdentityId("123"))
    result.toDisjunction should be(expected)
  }

  it should "return a bad response if the query string value contains a ZOQL injection attempt" in {
    val result = IdentityRetentionSteps.extractIdentityId(UrlParams(identityId = "123 or status='Active"))
    val expected = -\/(ApiGatewayResponse.badRequest)
    result.toDisjunction should be(expected)
  }

}
