package com.gu.identityBackfill

import com.gu.identityBackfill.IdentityBackfillSteps.WireModel.IdentityBackfillRequest
import com.gu.identityBackfill.PreReqCheck.PreReqResult
import com.gu.identityBackfill.Types._
import com.gu.util.Logging
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import play.api.libs.json.{Json, Reads}
import ApiGatewayOp._
import TypeConvert._

object IdentityBackfillSteps extends Logging {

  object WireModel {

    case class IdentityBackfillRequest(
      emailAddress: String,
      dryRun: Boolean
    )
    implicit val identityBackfillRequest: Reads[IdentityBackfillRequest] = Json.reads[IdentityBackfillRequest]

  }

  def fromRequest(identityBackfillRequest: IdentityBackfillRequest): EmailAddress = {
    EmailAddress(identityBackfillRequest.emailAddress)
  }

  def apply(
    preReqCheck: EmailAddress => ApiGatewayOp[PreReqResult],
    updateZuoraIdentityId: (AccountId, IdentityId) => ClientFailableOp[Unit],
    updateSalesforceIdentityId: (SFContactId, IdentityId) => ApiGatewayOp[Unit]
  )(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {

    (for {
      request <- apiGatewayRequest.bodyAsCaseClass[IdentityBackfillRequest]()
      preReq <- preReqCheck(fromRequest(request))
      _ <- dryRunAbort(request).withLogging("dryrun aborter")
      _ <- updateZuoraIdentityId(preReq.zuoraAccountId, preReq.requiredIdentityId).toApiGatewayOp("zuora issue")
      _ <- updateSalesforceIdentityId(preReq.sFContactId, preReq.requiredIdentityId)
      // need to remember which ones we updated?
    } yield ApiGatewayResponse.successfulExecution).apiResponse

  }

  def dryRunAbort(request: IdentityBackfillRequest): ApiGatewayOp[Unit] =
    if (request.dryRun)
      ReturnWithResponse(ApiGatewayResponse.noActionRequired("DRY RUN requested! skipping to the end"))
    else
      ContinueProcessing(())

}

