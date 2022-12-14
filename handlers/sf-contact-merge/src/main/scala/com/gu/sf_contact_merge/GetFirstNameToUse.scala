package com.gu.sf_contact_merge

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.Types.WinningSFContact
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps.IdentityAndSFContactAndEmail
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.FirstName
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.{ApiGatewayOp, _}

object GetFirstNameToUse {

  case class NameForIdentityId(identityId: Option[IdentityId], firstName: Option[FirstName])

  def firstNameForIdentityAccount(namesForIdentityIds: List[NameForIdentityId]): Option[FirstName] =
    namesForIdentityIds.collectFirst { case NameForIdentityId(Some(_: IdentityId), Some(firstName: FirstName)) =>
      firstName
    }

  case class NameForContactId(sfContactId: SFContactId, firstName: Option[FirstName])

  def firstNameForSFContact(
      newSFContactId: WinningSFContact,
      namesForContactIds: List[NameForContactId],
  ): ApiGatewayOp[Option[FirstName]] =
    namesForContactIds
      .find(_.sfContactId == newSFContactId.id)
      .toApiGatewayContinueProcessing(ApiGatewayResponse.notFound("winning contact id wasn't in any zuora account"))
      .map(_.firstName)

  def apply(
      sfContactId: WinningSFContact,
      accountAndEmails: List[IdentityAndSFContactAndEmail],
  ): ApiGatewayOp[Option[FirstName]] = {
    val nameForIdentityIds = accountAndEmails.map { info => NameForIdentityId(info.identityId, info.firstName) }
    val maybeIdentityFirstName = firstNameForIdentityAccount(nameForIdentityIds)
    val nameForContactIds = accountAndEmails.map { info => NameForContactId(info.sfContactId, info.firstName) }
    firstNameForSFContact(sfContactId, nameForContactIds).map { maybeOldFirstName =>
      maybeOldFirstName orElse maybeIdentityFirstName
    }
  }

}
