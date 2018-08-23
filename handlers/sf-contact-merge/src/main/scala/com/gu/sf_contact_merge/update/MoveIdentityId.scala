package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.sf_contact_merge.update.MoveIdentityId.OldSFContact
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.LinksFromZuora
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.SFContactUpdate
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}

object MoveIdentityId {

  def apply(
    setOrClearIdentityId: (SFContactId, Option[SFContactUpdate]) => ClientFailableOp[Unit]
  ): MoveIdentityId = (
    sfPointer: LinksFromZuora,
    maybeOldContactId: Option[OldSFContact],
    firstName: FirstName
  ) =>
    for {
      _ <- maybeOldContactId match {
        case Some(oldContactId) => setOrClearIdentityId(oldContactId.sfContactId, None)
        case None => ClientSuccess(())
      }
      _ <- sfPointer.identityId match {
        case Some(identityId) =>
          setOrClearIdentityId(sfPointer.sfContactId, Some(SFContactUpdate(identityId, firstName))) // this causes the sync to identity and zuora
        case None =>
          ClientSuccess(())
      }
    } yield ()

  case class OldSFContact(sfContactId: SFContactId)

}

trait MoveIdentityId {

  def apply(
    sfPointer: LinksFromZuora,
    maybeOldContactId: Option[OldSFContact],
    firstNameToUse: FirstName
  ): ClientFailableOp[Unit]

}
