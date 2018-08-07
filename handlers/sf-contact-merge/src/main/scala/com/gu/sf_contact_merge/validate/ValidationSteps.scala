package com.gu.sf_contact_merge.validate

import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps.IdentityAndSFContactAndEmail
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._

object ValidationSteps {
  def apply(
    identityId: Option[IdentityId],
    accountAndEmails: List[IdentityAndSFContactAndEmail]
  ): ApiGatewayOp[Unit] = for {
    _ <- AssertSameEmails(accountAndEmails.map(_.emailAddress))
    _ <- EnsureNoAccountWithWrongIdentityId(accountAndEmails.map(_.identityId), identityId)
      .toApiGatewayReturnResponse(ApiGatewayResponse.notFound)
  } yield ()
}
