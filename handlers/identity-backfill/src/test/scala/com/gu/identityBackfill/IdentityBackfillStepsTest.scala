package com.gu.identityBackfill

import com.gu.identityBackfill.IdentityBackfillSteps.DomainRequest
import com.gu.identityBackfill.PreReqCheck.PreReqResult
import com.gu.identityBackfill.Types.{AccountId, EmailAddress}
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class IdentityBackfillStepsTest extends AnyFlatSpec with Matchers {

  it should "backfill identity ids successfully" in {
    val ApiResponse(statusCode, _, _) = IdentityBackfillSteps.apply(
      _ => ContinueProcessing(PreReqResult(Set(AccountId("accountId")), Option(SFContactId("sfContactId")), None)),
      _ => ClientSuccess(IdentityId("123")),
      (_, _) => ContinueProcessing(()),
      (_, _) => ContinueProcessing(()),
    )(DomainRequest(EmailAddress("test@gu.com"), dryRun = false))

    statusCode shouldBe "200"
  }

  it should "return with bad request if prereq check fails" in {
    val ApiResponse(statusCode, _, _) = IdentityBackfillSteps.apply(
      _ => ReturnWithResponse(ApiResponse("400", "")),
      _ => fail(),
      (_, _) => fail(),
      (_, _) => fail(),
    )(DomainRequest(EmailAddress("test@gu.com"), dryRun = false))

    statusCode shouldBe "400"
  }

  "updateAccountsWithIdentityId" should "update salesforce accounts successfully" in {
    var updated: List[(AccountId, IdentityId)] = Nil

    val result = IdentityBackfillSteps.updateZuoraBillingAccountsIdentityId { (accountId, identityId) =>
      updated = accountId -> identityId :: updated
      ClientSuccess(())
    }(Set(AccountId("accountId1"), AccountId("accountId2")), IdentityId("123"))

    updated shouldBe AccountId("accountId2") -> IdentityId("123") :: AccountId("accountId1") -> IdentityId("123") :: Nil
    result shouldBe ContinueProcessing(())
  }

  "updateBuyersIdentityId" should "propagate errors" in {
    val ReturnWithResponse(result) = IdentityBackfillSteps.updateBuyersIdentityId { (_, _) =>
      GenericError("error")
    }(Option(SFContactId("sfContactId")), IdentityId("123"))

    result.body should include("updateBuyersIdentityId multiple errors updating 123: (sfContactId,error)")
  }

  "updateZuoraBillingAccountsIdentityId" should "propagate errors" in {
    val ReturnWithResponse(result) = IdentityBackfillSteps.updateZuoraBillingAccountsIdentityId { (_, _) =>
      GenericError("error")
    }(Set(AccountId("accountId1"), AccountId("accountId2")), IdentityId("123"))

    result.body should include(
      "updateZuoraBillingAccountsIdentityId multiple errors updating 123: (accountId1,error), (accountId2,error)",
    )
  }
}
