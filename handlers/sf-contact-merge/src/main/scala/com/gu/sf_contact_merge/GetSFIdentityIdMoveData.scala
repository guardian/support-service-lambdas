package com.gu.sf_contact_merge

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.getsfcontacts.GetSfContact.EmailIdentity
import com.gu.sf_contact_merge.update.UpdateSFContacts.{IdentityIdMoveData, IdentityIdToUse, OldSFContact}
import scalaz.{-\/, \/, \/-}

object GetSFIdentityIdMoveData {

  case class SFContactIdEmailIdentity(contactId: SFContactId, emailIdentity: EmailIdentity)

  def apply(canonicalEmail: EmailAddress, contactEmailIdentities: List[SFContactIdEmailIdentity]): String \/ Option[IdentityIdMoveData] = {
    val identityIdsForTargetEmail = contactEmailIdentities.filter(_.emailIdentity.address == canonicalEmail)
    val identityIdMoves = identityIdsForTargetEmail.collect({
      case SFContactIdEmailIdentity(contactId, EmailIdentity(address, Some(identity))) =>
        IdentityIdMoveData(OldSFContact(contactId), IdentityIdToUse(identity))
    })
    identityIdMoves match {
      case Nil => \/-(None)
      case id :: Nil => \/-(Some(id)) // don't need to distinct because should only have one identity id due to unique constraint in SF
      case multi => -\/(s"there are multiple identity ids: $multi")
    }
  }

}
