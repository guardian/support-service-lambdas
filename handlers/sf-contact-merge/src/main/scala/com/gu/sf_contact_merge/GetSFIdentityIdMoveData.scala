package com.gu.sf_contact_merge

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types.EmailIdentity
import com.gu.sf_contact_merge.update.UpdateSFContacts.{IdentityIdMoveData, IdentityIdToUse, OldSFContact}

object GetSFIdentityIdMoveData {

  case class SFContactIdEmailIdentity(contactId: SFContactId, emailIdentity: EmailIdentity)

  case class CanonicalEmail(emailAddress: EmailAddress)

  def apply(
      canonicalEmail: CanonicalEmail,
      contactEmailIdentities: List[SFContactIdEmailIdentity],
  ): Either[String, Option[IdentityIdMoveData]] = {
    val identityIdsForTargetEmail =
      contactEmailIdentities.filter(_.emailIdentity.address == canonicalEmail.emailAddress)
    val identityIdMoves = identityIdsForTargetEmail.collect({
      case SFContactIdEmailIdentity(contactId, EmailIdentity(address, Some(identity))) =>
        IdentityIdMoveData(OldSFContact(contactId), IdentityIdToUse(identity))
    })
    identityIdMoves match {
      case Nil => Right(None)
      case id :: Nil =>
        Right(
          Some(id),
        ) // don't need to distinct because should only have one identity id due to unique constraint in SF
      case multi => Left(s"there are multiple identity ids: $multi")
    }
  }

}
