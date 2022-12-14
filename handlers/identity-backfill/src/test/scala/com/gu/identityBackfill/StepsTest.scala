package com.gu.identityBackfill

import com.gu.identityBackfill.IdentityBackfillSteps.DomainRequest
import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class StepsTest extends AnyFlatSpec with Matchers {

  class StepsWithMocks {

    var zuoraUpdate: Option[(Set[AccountId], IdentityId)] = None // !!
    var salesforceUpdate: Option[(Option[SFContactId], IdentityId)] = None // !!
    var emailToCheck: Option[EmailAddress] = None // !!

    def getSteps(succeed: Boolean = true): DomainRequest => ApiResponse = {
      val preReqCheck: EmailAddress => ApiGatewayOp[PreReqCheck.PreReqResult] = { email =>
        emailToCheck = Some(email)
        if (succeed)
          ContinueProcessing(
            PreReqCheck.PreReqResult(Set(AccountId("acc")), Some(SFContactId("sf")), Some(IdentityId("existing"))),
          )
        else
          ContinueProcessing(PreReqCheck.PreReqResult(Set(AccountId("acc")), Some(SFContactId("sf")), None))
      }
      IdentityBackfillSteps(
        preReqCheck,
        createGuestAccount = email => ClientSuccess(IdentityId("created")),
        updateZuoraAccounts = (accountIds, idenitytId) => {
          zuoraUpdate = Some((accountIds, idenitytId))
          ContinueProcessing(())
        },
        updateSalesforceAccount = (sFContactId, identityId) => {
          salesforceUpdate = Some((sFContactId, identityId))
          ContinueProcessing(())
        },
      )
    }

  }

  it should "go through a happy case in real mode" in {

    val stepsWithMocks = new StepsWithMocks
    import stepsWithMocks._

    val result =
      getSteps()(DomainRequest(Types.EmailAddress("email@address"), dryRun = false))

    val expectedResult = ApiGatewayResponse.successfulExecution
    result should be(expectedResult)
    zuoraUpdate should be(Some((Set(AccountId("acc")), IdentityId("existing"))))
    salesforceUpdate should be(Some((Some(SFContactId("sf")), IdentityId("existing"))))
    emailToCheck should be(Some(EmailAddress("email@address")))
  }

  it should "go through a happy case in dry run mode without calling update" in {

    val stepsWithMocks = new StepsWithMocks
    import stepsWithMocks._

    val result =
      getSteps()(DomainRequest(Types.EmailAddress("email@address"), dryRun = true))

    val expectedResult = ApiGatewayResponse.noActionRequired("DRY RUN requested! skipping to the end")
    result should be(expectedResult)
    zuoraUpdate should be(None)
    salesforceUpdate should be(None)
    emailToCheck should be(Some(EmailAddress("email@address")))
  }

  it should "go through a already got identity (according to the zuora query bu identity id) case without calling update even not in dry run mode" in {

    val stepsWithMocks = new StepsWithMocks
    import stepsWithMocks._

    val result =
      getSteps(false)(DomainRequest(Types.EmailAddress("email@address"), dryRun = false))

    val expectedResult = ApiGatewayResponse.successfulExecution
    result should be(expectedResult)
    zuoraUpdate should be(Some((Set(AccountId("acc")), IdentityId("created"))))
    salesforceUpdate should be(Some((Some(SFContactId("sf")), IdentityId("created"))))
    emailToCheck should be(Some(EmailAddress("email@address")))
  }

}

object StepsData {

  def identityBackfillRequest(dryRun: Boolean): String =
    s"""{"emailAddress": "email@address", "dryRun": $dryRun}""""

}
