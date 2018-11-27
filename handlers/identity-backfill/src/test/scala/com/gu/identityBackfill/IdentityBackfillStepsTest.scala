package com.gu.identityBackfill

import com.gu.identityBackfill.IdentityBackfillSteps.DomainRequest
import com.gu.identityBackfill.PreReqCheck.PreReqResult
import com.gu.identityBackfill.Types.{AccountId, EmailAddress}
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import org.scalatest.{FlatSpec, Matchers}

class IdentityBackfillStepsTest extends FlatSpec with Matchers {

  it should "backfill identity ids successfully" in {
    val ApiResponse(statusCode, _, _) = IdentityBackfillSteps.apply(
      _ => ContinueProcessing(PreReqResult(Set(AccountId("accountId")), Set(SFContactId("sfContactId")), None)),
      _ => ClientSuccess(IdentityId("123")),
      (_, _) => ContinueProcessing(()),
      (_, _) => ContinueProcessing(())
    )(DomainRequest(EmailAddress("test@gu.com"), dryRun = false))

    statusCode shouldBe "200"
  }

  it should "return with bad request if prereq check fails" in {
    val ApiResponse(statusCode, _, _) = IdentityBackfillSteps.apply(
      _ => ReturnWithResponse(ApiResponse("400", "")),
      _ => fail(),
      (_, _) => fail(),
      (_, _) => fail()
    )(DomainRequest(EmailAddress("test@gu.com"), dryRun = false))

    statusCode shouldBe "400"
  }

  "updateAccountsWithIdentityId" should "update salesforce accounts successfully" in {
    val result = IdentityBackfillSteps
      .updateAccountsWithIdentityId[AccountId]((_, _) => ClientSuccess(()))(Set(AccountId("accountId1"), AccountId("accountId2")), IdentityId("123"))

    result shouldBe ContinueProcessing(())
  }

  "updateZuoraAccounts" should "propagate errors" in {
    val ReturnWithResponse(result) = IdentityBackfillSteps
      .updateAccountsWithIdentityId[AccountId]((_, _) => GenericError("error"))(Set(AccountId("accountId1"), AccountId("accountId2")), IdentityId("123"))

    result.body should include("updateAccountsWithIdentityId multiple errors")
  }
}
