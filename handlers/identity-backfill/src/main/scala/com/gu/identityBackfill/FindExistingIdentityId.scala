package com.gu.identityBackfill

import com.gu.identity.GetByEmail.IdentityAccount
import com.gu.identity.{GetByEmail, GetByIdentityId}
import com.gu.identity.GetByIdentityId.IdentityUser
import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ApiGatewayResponse.notFound
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, NotFound}

object FindExistingIdentityId {

  def apply(
      getByEmail: EmailAddress => ClientFailableOp[GetByEmail.IdentityAccount],
      getByIdentityId: IdentityId => ClientFailableOp[GetByIdentityId.IdentityUser],
  )(emailAddress: EmailAddress): ApiGatewayOp[Option[IdentityId]] = {

    def continueIfNoPassword(identityId: IdentityId) = {
      getByIdentityId(identityId) match {
        case ClientSuccess(IdentityUser(_, false)) => ContinueProcessing(Some(identityId))
        case _ =>
          ReturnWithResponse(notFound(s"Identity account not validated but password is set: ${identityId.value}"))
      }
    }

    val result = getByEmail(emailAddress) match {
      case ClientSuccess(IdentityAccount(identityId, true)) => ContinueProcessing(Some(identityId))
      case ClientSuccess(IdentityAccount(identityId, false)) => continueIfNoPassword(identityId)
      case NotFound(_) => ContinueProcessing(None)
      case other: ClientFailure => ReturnWithResponse(ApiGatewayResponse.internalServerError(other.toString))
    }

    result.withLogging("FindExistingIdentityId")
  }

}
