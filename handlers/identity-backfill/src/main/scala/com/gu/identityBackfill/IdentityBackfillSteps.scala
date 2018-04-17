package com.gu.identityBackfill

import com.gu.identityBackfill.IdentityBackfillSteps.WireModel.IdentityBackfillRequest
import com.gu.identityBackfill.PreReqCheck.PreReqResult
import com.gu.identityBackfill.Types._
import com.gu.util.Logging
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types._
import play.api.libs.json.{Json, Reads}
import scalaz.{-\/, \/-}

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
    preReqCheck: EmailAddress => FailableOp[PreReqResult],
    updateZuoraIdentityId: (AccountId, IdentityId) => FailableOp[Unit],
    updateSalesforceIdentityId: (SFContactId, IdentityId) => FailableOp[Unit]
  )(apiGatewayRequest: ApiGatewayRequest) = {

    for {
      request <- Json.parse(apiGatewayRequest.body).validate[IdentityBackfillRequest]
        .toFailableOp.withLogging("identity id backfill request")
      preReq <- preReqCheck(fromRequest(request))
      _ <- dryRunAbort(request).withLogging("dryrun aborter")
      _ <- updateZuoraIdentityId(preReq.zuoraAccountId, preReq.requiredIdentityId)
      _ <- updateSalesforceIdentityId(preReq.sFContactId, preReq.requiredIdentityId)
      // need to remember which ones we updated?
    } yield ()

  }

  def dryRunAbort(request: IdentityBackfillRequest): FailableOp[Unit] =
    if (request.dryRun)
      -\/(ApiGatewayResponse.noActionRequired("DRY RUN requested! skipping to the end"))
    else
      \/-(())

}

