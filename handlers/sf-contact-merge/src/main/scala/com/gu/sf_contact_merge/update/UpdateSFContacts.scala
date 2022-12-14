package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.Types.WinningSFContact
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, FirstName}
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddressOverride.{DontOverrideAddress, SFAddressOverride}
import com.gu.sf_contact_merge.update.UpdateSFContacts.IdentityIdMoveData
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId._
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}

object UpdateSFContacts {

  def apply(
      setOrClearIdentityId: SetOrClearIdentityId,
  ): UpdateSFContacts = (
      sfContactId: WinningSFContact,
      maybeMoveIdentityIdData: Option[IdentityIdMoveData],
      firstName: Option[FirstName],
      maybeSFAddressOverride: SFAddressOverride,
      maybeOverwriteEmailAddress: Option[EmailAddress],
  ) =>
    for {
      _ <- maybeMoveIdentityIdData.map(_.oldSFContact) match {
        case Some(oldContactId) => {
          val sFContactUpdate = SFContactUpdate(None, DontChangeFirstName, DontOverrideAddress, None)
          setOrClearIdentityId.apply(oldContactId.sfContactId, sFContactUpdate)
        }
        case None => ClientSuccess(())
      }
      _ <- {
        val sFContactUpdate = SFContactUpdate(
          maybeMoveIdentityIdData.map(_.identityIdUpdate.value),
          firstName.map(SetFirstName.apply).getOrElse(DummyFirstName),
          maybeSFAddressOverride,
          maybeOverwriteEmailAddress,
        )
        setOrClearIdentityId.apply(sfContactId.id, sFContactUpdate) // this causes the sync to identity and zuora
      }
    } yield ()

  case class OldSFContact(sfContactId: SFContactId)

  case class IdentityIdToUse(value: IdentityId)
  case class IdentityIdMoveData(oldSFContact: OldSFContact, identityIdUpdate: IdentityIdToUse)

}

trait UpdateSFContacts {

  def apply(
      sfContactId: WinningSFContact,
      maybeMoveIdentityIdData: Option[IdentityIdMoveData],
      firstNameToUse: Option[FirstName],
      maybeSFAddressOverride: SFAddressOverride,
      maybeOverwriteEmailAddress: Option[EmailAddress],
  ): ClientFailableOp[Unit]

}
