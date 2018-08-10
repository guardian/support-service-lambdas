package com.gu.sf_contact_merge.getaccounts

import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetEmails.EmailAddress
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.zuora.SafeQueryBuilder.MaybeNonEmptyList
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import scalaz.NonEmptyList

object GetIdentityAndZuoraEmailsForAccountsSteps {

  case class IdentityAndSFContactAndEmail(
    identityId: Option[IdentityId],
    sfContactId: SFContactId,
    emailAddress: Option[EmailAddress]
  )

  def apply(zuoraQuerier: ZuoraQuerier, accountIds: NonEmptyList[AccountId]): ClientFailableOp[List[IdentityAndSFContactAndEmail]] = {

    val getEmails: NonEmptyList[GetEmails.ContactId] => ClientFailableOp[Map[GetEmails.ContactId, Option[EmailAddress]]] =
      GetEmails(zuoraQuerier, _)
    val getContacts: NonEmptyList[AccountId] => ClientFailableOp[Map[GetEmails.ContactId, GetContacts.IdentityAndSFContact]] =
      GetContacts(zuoraQuerier, _)

    for {
      identityForBillingContact <- getContacts(accountIds)
      emailForBillingContact <- MaybeNonEmptyList(identityForBillingContact.keys.toList) match {
        case Some(contactIds) => getEmails(contactIds)
        case None => ClientSuccess(Map.empty[Any, Nothing])
      }
    } yield {
      identityForBillingContact.map {
        case (contact, account) =>
          IdentityAndSFContactAndEmail(account.identityId, account.sfContactId, emailForBillingContact.get(contact).flatten)
      }.toList
    }
  }

}
