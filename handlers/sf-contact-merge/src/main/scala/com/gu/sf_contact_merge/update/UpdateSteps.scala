package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.getaccounts.GetContacts.{AccountId, IdentityId, SFContactId}
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.LinksFromZuora
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import scalaz.NonEmptyList
import scalaz.syntax.traverse.ToTraverseOps

object UpdateSteps {

  def apply(
    setOrClearIdentityId: ((SFContactId, Option[IdentityId])) => ClientFailableOp[Unit],
    updateAccountSFLinks: LinksFromZuora => AccountId => ClientFailableOp[Unit]
  )(
    sfPointer: LinksFromZuora,
    maybeOldContactId: Option[SFContactId],
    accountIds: NonEmptyList[AccountId]
  ): ClientFailableOp[Unit] = {
    for {
      _ <- accountIds.traverseU(updateAccountSFLinks(sfPointer))
      _ <- maybeOldContactId match {
        case Some(oldContactId) => setOrClearIdentityId((oldContactId, None))
        case None => ClientSuccess(())
      }
      _ <- sfPointer.identityId match {
        case Some(identityId) =>
          setOrClearIdentityId((sfPointer.sfContactId, Some(identityId))) // this causes the sync to identity and zuora
        case None =>
          ClientSuccess(())
      }
    } yield ()
  }

}
