package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.FirstName
import com.gu.sf_contact_merge.update.MoveIdentityId.OldSFContact
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.LinksFromZuora
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{DontChangeFirstName, DummyFirstName, SFContactUpdate, SetFirstName}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}

object MoveIdentityId {

  def apply(
    setOrClearIdentityId: (SFContactId, SFContactUpdate) => ClientFailableOp[Unit]
  ): MoveIdentityId = (
    sfPointer: LinksFromZuora,
    maybeOldContactId: Option[OldSFContact],
    firstName: Option[FirstName]
  ) =>
    for {
      _ <- maybeOldContactId match {
        case Some(oldContactId) => {
          val sFContactUpdate = SFContactUpdate(None, DontChangeFirstName)
          setOrClearIdentityId(oldContactId.sfContactId, sFContactUpdate)
        }
        case None => ClientSuccess(())
      }
      _ <- {
        val sFContactUpdate = SFContactUpdate(sfPointer.identityId, firstName.map(SetFirstName.apply).getOrElse(DummyFirstName))
        setOrClearIdentityId(sfPointer.sfContactId, sFContactUpdate) // this causes the sync to identity and zuora
      }
    } yield ()

  case class OldSFContact(sfContactId: SFContactId)

}

trait MoveIdentityId {

  def apply(
    sfPointer: LinksFromZuora,
    maybeOldContactId: Option[OldSFContact],
    firstNameToUse: Option[FirstName]
  ): ClientFailableOp[Unit]

}
