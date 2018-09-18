package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.FirstName
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddressOverride.{DontOverrideAddress, SFAddressOverride}
import com.gu.sf_contact_merge.update.UpdateSFContacts.OldSFContact
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{DontChangeFirstName, DummyFirstName, IdentityId, SFContactUpdate, SetFirstName}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}

object UpdateSFContacts {

  def apply(
    setOrClearIdentityId: SetOrClearIdentityId
  ): UpdateSFContacts = (
    sfContactId: SFContactId,
    identityId: Option[IdentityId],
    maybeOldContactId: Option[OldSFContact],
    firstName: Option[FirstName],
    maybeSFAddressOverride: SFAddressOverride
  ) =>
    for {
      _ <- maybeOldContactId match {
        case Some(oldContactId) => {
          val sFContactUpdate = SFContactUpdate(None, DontChangeFirstName, DontOverrideAddress)
          setOrClearIdentityId.apply(oldContactId.sfContactId, sFContactUpdate)
        }
        case None => ClientSuccess(())
      }
      _ <- {
        val sFContactUpdate = SFContactUpdate(
          identityId,
          firstName.map(SetFirstName.apply).getOrElse(DummyFirstName),
          maybeSFAddressOverride
        )
        setOrClearIdentityId.apply(sfContactId, sFContactUpdate) // this causes the sync to identity and zuora
      }
    } yield ()

  case class OldSFContact(sfContactId: SFContactId)

}

trait UpdateSFContacts {

  def apply(
    sfContactId: SFContactId,
    identityId: Option[IdentityId],
    maybeOldContactId: Option[OldSFContact],
    firstNameToUse: Option[FirstName],
    maybeSFAddressOverride: SFAddressOverride
  ): ClientFailableOp[Unit]

}
