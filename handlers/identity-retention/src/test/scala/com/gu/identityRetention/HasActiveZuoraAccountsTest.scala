package com.gu.identityRetention

import com.gu.identityRetention.GetActiveZuoraAccounts.IdentityQueryResponse
import com.gu.identityRetention.Types.AccountId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import com.gu.util.zuora.ZuoraQuery.QueryResult
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HasActiveZuoraAccountsTest extends AnyFlatSpec with Matchers {

  val noZuoraAccounts = QueryResult[IdentityQueryResponse](Nil, 0, true, None)

  val singleZuoraAccount = QueryResult[IdentityQueryResponse](List(IdentityQueryResponse("acc123")), 1, true, None)

  it should "return a left(404) if the identity id is not linked to any Zuora accounts" in {
    val zuoraCheck = GetActiveZuoraAccounts.processQueryResult(ClientSuccess(noZuoraAccounts))
    val expected = Left(IdentityRetentionApiResponses.canBeDeleted)
    zuoraCheck.toDisjunction should be(expected)
  }

  it should "return a left(500) if the call to Zuora fails" in {
    val zuoraCheck = GetActiveZuoraAccounts.processQueryResult(GenericError("Zuora response was a 500"))
    val expected =
      Left(ApiGatewayResponse.internalServerError("Failed to retrieve the identity user's details from Zuora"))
    zuoraCheck.toDisjunction should be(expected)
  }

  it should "return a list of account ids if we find an identity id linked to a billing account" in {
    val zuoraCheck = GetActiveZuoraAccounts.processQueryResult(ClientSuccess(singleZuoraAccount))
    val expected = Right(List(AccountId("acc123")))
    zuoraCheck.toDisjunction should be(expected)
  }

}
