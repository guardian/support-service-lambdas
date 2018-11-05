package com.gu.identityBackfill

import com.gu.identityBackfill.PreReqCheck.PreReqResult
import com.gu.identityBackfill.TypeConvert._
import com.gu.identityBackfill.Types._
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}

object IdentityBackfillSteps extends Logging {

  case class DomainRequest(
    emailAddress: EmailAddress,
    dryRun: Boolean
  )

  def apply(
    preReqCheck: EmailAddress => ApiGatewayOp[PreReqResult],
    createGuestAccount: EmailAddress => ClientFailableOp[IdentityId],
    updateZuoraIdentityId: (AccountId, IdentityId) => ClientFailableOp[Unit],
    updateSalesforceIdentityId: (SFContactId, IdentityId) => ApiGatewayOp[Unit]
  )(request: DomainRequest): ApiResponse = {

    (for {
      preReq <- preReqCheck(request.emailAddress)
      _ <- dryRunAbort(request).withLogging("dryrun aborter")
      requiredIdentityId <- (preReq.existingIdentityId match {
        case Some(existingIdentityId) => ClientSuccess(existingIdentityId)
        case None => createGuestAccount(request.emailAddress)
      }).toApiGatewayOp("create guest identity account")
      _ <- updateZuoraIdentityId(preReq.zuoraAccountId, requiredIdentityId).toApiGatewayOp("update zuora identity id field")
      _ <- updateSalesforceIdentityId(preReq.sFContactId, requiredIdentityId)
      // need to remember which ones we updated?
    } yield ApiGatewayResponse.successfulExecution).apiResponse

  }

  def dryRunAbort(request: DomainRequest): ApiGatewayOp[Unit] =
    if (request.dryRun)
      ReturnWithResponse(ApiGatewayResponse.noActionRequired("DRY RUN requested! skipping to the end"))
    else
      ContinueProcessing(())

}
