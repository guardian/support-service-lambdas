package com.gu.sf_contact_merge.validation

import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.validation.GetContacts.{AccountId, IdentityId}
import com.gu.sf_contact_merge.validation.GetIdentityAndZuoraEmailsForAccounts.AccountAndEmail
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import scalaz.NonEmptyList

object ValidationSteps {
  def apply(
    getZuoraEmails: NonEmptyList[AccountId] => ClientFailableOp[List[AccountAndEmail]]
  )(
    accountIds: NonEmptyList[AccountId],
    identityId: Option[IdentityId]
  ): ApiGatewayOp[Unit] = for {
    accountAndEmails <- getZuoraEmails(accountIds).toApiGatewayOp("get zuora emails")
    _ <- AssertSameEmails(accountAndEmails.map(_.emailAddress))
    _ <- EnsureNoAccountWithWrongIdentityId(accountAndEmails.map(_.account.identityId), identityId)
      .toApiGatewayReturnResponse(ApiGatewayResponse.notFound)
  } yield ()
}
