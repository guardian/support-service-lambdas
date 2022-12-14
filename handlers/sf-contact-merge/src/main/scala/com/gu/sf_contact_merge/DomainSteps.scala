package com.gu.sf_contact_merge

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.GetSFIdentityIdMoveData.{CanonicalEmail, SFContactIdEmailIdentity}
import com.gu.sf_contact_merge.SFSteps.SFContactsForEmailData
import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.Types.WinningSFContact
import com.gu.sf_contact_merge.ZuoraSteps.{ContactAndAccounts, ZuoraData}
import com.gu.sf_contact_merge.getaccounts.GetContacts.AccountId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, LastName}
import com.gu.sf_contact_merge.getaccounts.{GetIdentityAndZuoraEmailsForAccountsSteps, GetZuoraContactDetails}
import com.gu.sf_contact_merge.getsfcontacts.DedupSfContacts.SFContactsForMerge
import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types.SFContact
import com.gu.sf_contact_merge.getsfcontacts.{DedupSfContacts, GetSfAddressOverride}
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{
  CRMAccountId,
  ClearZuoraIdentityId,
  ReplaceZuoraIdentityId,
  ZuoraFieldUpdates,
}
import com.gu.sf_contact_merge.update.{UpdateAccountSFLinks, UpdateSFContacts}
import com.gu.sf_contact_merge.validate.GetVariations.{Differing, HasAllowableVariations, HasNoVariations, Variations}
import com.gu.sf_contact_merge.validate.{GetVariations, ValidateNoLosingDigitalVoucher}
import com.gu.util.apigateway.{ApiGatewayResponse, ResponseModels}
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types.{ApiGatewayOp, _}
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import cats.data.NonEmptyList

object DomainSteps {

  case class MergeRequest(
      winningSFContact: WinningSFContact,
      crmAccountId: CRMAccountId,
      zuoraAccountIds: NonEmptyList[AccountId],
  )

  def apply(
      zuoraSteps: ZuoraSteps,
      updateSFContacts: UpdateSFContacts,
      updateAccountSFLinks: UpdateAccountSFLinks,
      sfSteps: SFSteps,
  )(mergeRequest: MergeRequest): ResponseModels.ApiResponse =
    (for {
      zuoraData <- zuoraSteps.apply(ContactAndAccounts(mergeRequest.winningSFContact, mergeRequest.zuoraAccountIds))

      sfData <- sfSteps.apply(zuoraData.dedupedContactIds)

      _ <- {
        val linksFromZuora = ZuoraFieldUpdates(
          mergeRequest.winningSFContact,
          mergeRequest.crmAccountId,
          sfData.sfIdentityIdMoveData.map(_.identityIdUpdate) match {
            case Some(identityIdToUse) => ReplaceZuoraIdentityId(identityIdToUse.value)
            case None => ClearZuoraIdentityId
          },
          sfData.maybeEmailOverride,
        )
        mergeRequest.zuoraAccountIds.traverse(updateAccountSFLinks(linksFromZuora, _))
      }.toApiGatewayOp("update zuora accounts with winning details")
      _ <- updateSFContacts(
        mergeRequest.winningSFContact,
        sfData.sfIdentityIdMoveData,
        zuoraData.firstNameToUse,
        sfData.maybeSFAddressOverride,
        sfData.maybeEmailOverride,
      ).toApiGatewayOp("update sf contact(s) to get identity id and winning details in the right contact")
    } yield ApiGatewayResponse.successfulExecution).apiResponse

}

object SFSteps {

  case class GetSfContact(apply: HttpOp[SFContactId, SFContact])

  def apply(getSfContact: GetSfContact): SFSteps = { dedupedContactIds =>
    val sfContacts =
      dedupedContactIds.map(id => getSfContact.apply.runRequestLazy(id).map(contact => IdWithContact(id, contact)))
    for {
      maybeSFAddressOverride <- GetSfAddressOverride
        .apply(sfContacts.map(_.value.map(_.contact.SFMaybeAddress)))
        .toApiGatewayOp("get salesforce addresses")
      _ <- ValidateNoLosingDigitalVoucher(sfContacts.others.map(_.map(_.contact.isDigitalVoucherUser)))
      contacts <- flattenContactData(sfContacts).toApiGatewayOp("get contacts from SF")
      emailAddressVariations = GetVariations.forEmailAddress(contacts.map(_.emailIdentity.address))
      emailOverrides <- toApiCanonicalEmail(emailAddressVariations)
      sfIdentityIdMoveData <- GetSFIdentityIdMoveData(emailOverrides.canonicalEmail, contacts)
        .toApiGatewayOp(ApiGatewayResponse.notFound _)
    } yield SFContactsForEmailData(sfIdentityIdMoveData, emailOverrides.needToOverwriteWith, maybeSFAddressOverride)
  }

  def toApiCanonicalEmail(variations: Variations[EmailAddress]): ApiGatewayOp[CanonicalEmailAndOverwriteEmail] =
    variations match {
      case Differing(elements) =>
        ReturnWithResponse(ApiGatewayResponse.notFound(s"those zuora accounts had differing emails: $elements"))
      case HasNoVariations(canonical) =>
        ContinueProcessing(CanonicalEmailAndOverwriteEmail(CanonicalEmail(canonical), needToOverwrite = false))
      case HasAllowableVariations(canonical) =>
        ContinueProcessing(CanonicalEmailAndOverwriteEmail(CanonicalEmail(canonical), needToOverwrite = true))
    }

  def flattenContactData(
      sfContacts: SFContactsForMerge[LazyClientFailableOp[IdWithContact]],
  ): ClientFailableOp[List[SFContactIdEmailIdentity]] = {
    val contactsList = NonEmptyList(sfContacts.winner, sfContacts.others)
    val lazyContactsEmailIdentity = contactsList.map(
      _.map(idWithContact => SFContactIdEmailIdentity(idWithContact.id, idWithContact.contact.emailIdentity)),
    )
    lazyContactsEmailIdentity.traverse(_.value).map(_.toList)
  }

  case class IdWithContact(id: SFContactId, contact: SFContact)

  case class CanonicalEmailAndOverwriteEmail(canonicalEmail: CanonicalEmail, needToOverwrite: Boolean) {
    def needToOverwriteWith: Option[EmailAddress] = if (needToOverwrite) Some(canonicalEmail.emailAddress) else None
  }

  case class SFContactsForEmailData(
      sfIdentityIdMoveData: Option[UpdateSFContacts.IdentityIdMoveData],
      maybeEmailOverride: Option[EmailAddress],
      maybeSFAddressOverride: GetSfAddressOverride.SFAddressOverride,
  )

}
trait SFSteps {
  def apply(dedupedContactIds: SFContactsForMerge[SFContactId]): ApiGatewayOp[SFContactsForEmailData]

}

object ZuoraSteps {

  case class ContactAndAccounts(
      winningSFContact: WinningSFContact,
      zuoraAccountIds: NonEmptyList[AccountId],
  )

  def apply(getIdentityAndZuoraEmailsForAccounts: GetIdentityAndZuoraEmailsForAccountsSteps): ZuoraSteps = {
    contactAndAccounts =>
      for {
        zuoraAccountAndEmails <- getIdentityAndZuoraEmailsForAccounts(contactAndAccounts.zuoraAccountIds)
          .toApiGatewayOp("getIdentityAndZuoraEmailsForAccounts")
        _ <- StopIfNoContactsToChange(contactAndAccounts.winningSFContact.id, zuoraAccountAndEmails.map(_.sfContactId))
        variations = GetVariations.forLastName(zuoraAccountAndEmails.map(_.lastName))
        _ <- toApiResponse(variations)
        firstNameToUse <- GetFirstNameToUse(contactAndAccounts.winningSFContact, zuoraAccountAndEmails)
        allSFContactIds = SFContactsForMerge(
          contactAndAccounts.winningSFContact.id,
          zuoraAccountAndEmails.map(_.sfContactId),
        )
        dedupedContactIds = DedupSfContacts.apply(allSFContactIds)
      } yield ZuoraData(firstNameToUse, dedupedContactIds)
  }

  def toApiResponse(variations: Variations[LastName]): ApiGatewayOp[Unit] = variations match {
    case Differing(elements) =>
      ReturnWithResponse(ApiGatewayResponse.notFound(s"those zuora accounts had differing lastname: $elements"))
    case _ =>
      ContinueProcessing(())
  }

  case class ZuoraData(
      firstNameToUse: Option[GetZuoraContactDetails.FirstName],
      dedupedContactIds: SFContactsForMerge[SFContactId],
  )

}
trait ZuoraSteps {
  def apply(mergeRequest: ContactAndAccounts): ApiGatewayOp[ZuoraData]
}
