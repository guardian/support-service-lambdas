package com.gu.identityRetention

import com.gu.identityRetention.HasActiveZuoraAccounts.IdentityQueryResponse
import com.gu.identityRetention.Types.AccountId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.zuora.RestRequestMaker.GenericError
import com.gu.util.zuora.ZuoraQuery.QueryResult
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/-}

class HasActiveZuoraAccountsTest extends FlatSpec with Matchers {

  val noZuoraAccounts = QueryResult[IdentityQueryResponse](Nil, 0, true, None)

  val singleZuoraAccount = QueryResult[IdentityQueryResponse](List(IdentityQueryResponse("acc123")), 1, true, None)

  it should "return a left(404) if the identity id is not linked to any Zuora accounts" in {
    val zuoraCheck = HasActiveZuoraAccounts.processQueryResult(\/-(noZuoraAccounts))
    val expected = -\/(IdentityRetentionApiResponses.canBeDeleted)
    zuoraCheck.toDisjunction should be(expected)
  }

  it should "return a left(500) if the call to Zuora fails" in {
    val zuoraCheck = HasActiveZuoraAccounts.processQueryResult(-\/(GenericError("Zuora response was a 500")))
    val expected = -\/(ApiGatewayResponse.internalServerError("Failed to retrieve the identity user's details from Zuora"))
    zuoraCheck.toDisjunction should be(expected)
  }

  it should "return a list of account ids if we find an identity id linked to a billing account" in {
    val zuoraCheck = HasActiveZuoraAccounts.processQueryResult(\/-(singleZuoraAccount))
    val expected = \/-(List(AccountId("acc123")))
    zuoraCheck.toDisjunction should be(expected)
  }

}
