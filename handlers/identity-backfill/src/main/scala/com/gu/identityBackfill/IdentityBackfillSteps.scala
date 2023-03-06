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
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess}

object IdentityBackfillSteps extends Logging {

  case class DomainRequest(
      emailAddress: EmailAddress,
      dryRun: Boolean,
  )

  def apply(
      preReqCheck: EmailAddress => ApiGatewayOp[PreReqResult],
      createGuestAccount: EmailAddress => ClientFailableOp[IdentityId],
      updateZuoraAccounts: (Set[AccountId], IdentityId) => ApiGatewayOp[Unit],
      updateSalesforceAccount: (Option[SFContactId], IdentityId) => ApiGatewayOp[Unit],
  )(request: DomainRequest): ApiResponse = {

    (for {
      preReq <- preReqCheck(request.emailAddress)
      _ <- dryRunAbort(request).withLogging("dryrun aborter")
      requiredIdentityId <- (preReq.existingIdentityId match {
        case Some(existingIdentityId) => ClientSuccess(existingIdentityId)
        case None => createGuestAccount(request.emailAddress)
      }).toApiGatewayOp("create guest identity account")
      _ <- updateZuoraAccounts(preReq.zuoraAccountIds, requiredIdentityId)
      _ <- updateSalesforceAccount(preReq.maybeBuyer, requiredIdentityId)
      // need to remember which ones we updated?
    } yield ApiGatewayResponse.successfulExecution).apiResponse

  }

  def dryRunAbort(request: DomainRequest): ApiGatewayOp[Unit] =
    if (request.dryRun)
      ReturnWithResponse(ApiGatewayResponse.noActionRequired("DRY RUN requested! skipping to the end"))
    else
      ContinueProcessing(())

  def updateBuyersIdentityId(
      updateSalesforceContactIdentityId: (SFContactId, IdentityId) => ClientFailableOp[Unit],
  )(maybeBuyerContactId: Option[SFContactId], identityId: IdentityId): ApiGatewayOp[Unit] = {

    val failures = maybeBuyerContactId
      .map(updateSalesforceContactIdentityId(_, identityId))
      .zip(maybeBuyerContactId)
      .collect { case (clientFailure: ClientFailure, id) =>
        (id.value -> clientFailure.message).toString
      }

    if (failures.isEmpty)
      ContinueProcessing(())
    else
      ReturnWithResponse(
        ApiGatewayResponse.badRequest(
          s"updateBuyersIdentityId multiple errors updating ${identityId.value}: ${failures.mkString(", ")}",
        ),
      )

  }

  def updateZuoraBillingAccountsIdentityId(
      updateAccountsWithIdentityId: (AccountId, IdentityId) => ClientFailableOp[Unit],
  )(ids: Set[AccountId], identityId: IdentityId): ApiGatewayOp[Unit] = {

    val idsOrdered = ids.toSeq
    val failures = idsOrdered
      .map(updateAccountsWithIdentityId(_, identityId))
      .zip(idsOrdered)
      .collect { case (clientFailure: ClientFailure, id) =>
        (id.value -> clientFailure.message).toString
      }

    if (failures.isEmpty)
      ContinueProcessing(())
    else
      ReturnWithResponse(
        ApiGatewayResponse.badRequest(
          s"updateZuoraBillingAccountsIdentityId multiple errors updating ${identityId.value}: ${failures.mkString(", ")}",
        ),
      )

  }

}
