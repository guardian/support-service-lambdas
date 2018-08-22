package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.LinksFromZuora
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.SFContactUpdate
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}

object MoveIdentityId {

  def apply(
    setOrClearIdentityId: (SFContactId, Option[SFContactUpdate]) => ClientFailableOp[Unit]
  ): MoveIdentityId = (
    sfPointer: LinksFromZuora,
    maybeOldContactId: Option[SFContactId],
    firstName: FirstName
  ) =>
    for {
      _ <- maybeOldContactId match {
        case Some(oldContactId) => setOrClearIdentityId(oldContactId, None)
        case None => ClientSuccess(())
      }
      _ <- sfPointer.identityId match {
        case Some(identityId) =>
          setOrClearIdentityId(sfPointer.sfContactId, Some(SFContactUpdate(identityId, firstName))) // this causes the sync to identity and zuora
        case None =>
          ClientSuccess(())
      }
    } yield ()

}

trait MoveIdentityId {

  def apply(
    sfPointer: LinksFromZuora,
    maybeOldContactId: Option[SFContactId],
    firstNameToUse: FirstName
  ): ClientFailableOp[Unit]

}
