package com.gu.sf_contact_merge.getaccounts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetIdentityAndZuoraEmailsForAccountsSteps.IdentityAndSFContactAndEmail
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, FirstName, LastName}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.zuora.SafeQueryBuilder.MaybeNonEmptyList
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import cats.data.NonEmptyList

object GetIdentityAndZuoraEmailsForAccountsSteps {

  case class IdentityAndSFContactAndEmail(
      identityId: Option[IdentityId],
      sfContactId: SFContactId,
      emailAddress: Option[EmailAddress],
      firstName: Option[FirstName],
      lastName: LastName,
  )

  def apply(zuoraQuerier: ZuoraQuerier): GetIdentityAndZuoraEmailsForAccountsSteps = { accountIds =>
    val getZuoraContactDetails: GetZuoraContactDetails = GetZuoraContactDetails(zuoraQuerier)
    val getContacts: NonEmptyList[AccountId] => ClientFailableOp[
      Map[GetZuoraContactDetails.ContactId, GetContacts.IdentityAndSFContact],
    ] =
      GetContacts(zuoraQuerier, _)

    for {
      identityForBillingContact <- getContacts(accountIds)
      contactDetailsForBillingContact <- MaybeNonEmptyList(identityForBillingContact.keys.toList) match {
        case Some(contactIds) => getZuoraContactDetails(contactIds)
        case None => ClientSuccess(Map.empty[Any, Nothing])
      }
    } yield {
      identityForBillingContact.map { case (contact, account) =>
        val contactDetails = contactDetailsForBillingContact(contact)
        IdentityAndSFContactAndEmail(
          account.identityId,
          account.sfContactId,
          contactDetails.emailAddress,
          contactDetails.firstName,
          contactDetails.lastName,
        )
      }.toList
    }
  }

}
trait GetIdentityAndZuoraEmailsForAccountsSteps {
  def apply(accountIds: NonEmptyList[AccountId]): ClientFailableOp[List[IdentityAndSFContactAndEmail]]
}
