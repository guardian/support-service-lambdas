package com.gu.identityRetention

import com.gu.identityRetention.IdentityRetentionSteps.UrlParams
import com.gu.identityRetention.Types.IdentityId
import com.gu.util.apigateway.ApiGatewayResponse
import org.scalatest.{FlatSpec, Matchers}

class IdentityRetentionStepsTest extends FlatSpec with Matchers {

  it should "return the identity id if it was included in a query string param" in {
    val result = IdentityRetentionSteps.extractIdentityId(UrlParams(identityId = "123"))
    val expected = Right(IdentityId("123"))
    result.toDisjunction should be(expected)
  }

  it should "return a bad response if the query string value contains a ZOQL injection attempt" in {
    val result = IdentityRetentionSteps.extractIdentityId(UrlParams(identityId = "123 or status='Active"))
    val expected = Left(ApiGatewayResponse.badRequest("no identity id"))
    result.toDisjunction should be(expected)
  }

}
