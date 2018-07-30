package com.gu.sf_contact_merge

import com.gu.sf_contact_merge.GetIdentityAndZuoraEmailsForAccounts.{Account, IdentityId}
import com.gu.sf_contact_merge.UpdateAccountSFLinks.SFPointer
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.{ApiGatewayOp, _}

object EnsureNoAccountWithWrongIdentityId { // make sure all accounts are either this identity id or none
  def apply(sfPointer: SFPointer, accounts: List[Account], maybeCorrectIdentityId: Option[IdentityId]): ApiGatewayOp[Unit] =
    maybeCorrectIdentityId match {
      case Some(correctIdentityId) =>
        val wrongIdentityIdIsThere = accounts.filter(_.identityId.exists(_ != correctIdentityId))
        wrongIdentityIdIsThere.nonEmpty.toApiGatewayReturnResponse(ApiGatewayResponse.notFound(s"one of the accounts had an unexpected identity id other than $correctIdentityId - can't merge yet: $wrongIdentityIdIsThere"))
      case None =>
        val hasIdentityButWillLoseIt = accounts.filter(_.identityId.isDefined)
        hasIdentityButWillLoseIt.nonEmpty.toApiGatewayReturnResponse(ApiGatewayResponse.notFound(s"one of the accounts had an identity id but will lose it: $hasIdentityButWillLoseIt"))
    }

}
