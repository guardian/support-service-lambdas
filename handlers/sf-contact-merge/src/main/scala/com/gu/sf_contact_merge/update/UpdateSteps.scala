package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.validate.GetContacts.{AccountId, IdentityId}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import scalaz.NonEmptyList
import scalaz.syntax.traverse.ToTraverseOps

object UpdateSteps {
  def apply(
    setOrClearIdentityId: Option[IdentityId] => AccountId => Types.ClientFailableOp[Unit],
    updateAccountSFLinks: AccountId => ClientFailableOp[Unit]
  )(
    accountIds: NonEmptyList[AccountId],
    maybeUpdateIdentityId: Option[IdentityId]
  ): ClientFailableOp[Unit] = {
    for {
      _ <- if (maybeUpdateIdentityId.isDefined) {
        accountIds.traverseU(setOrClearIdentityId(None))
      } else ClientSuccess(())
      _ <- accountIds.traverseU(updateAccountSFLinks)
      _ <- maybeUpdateIdentityId match {
        case Some(identityId) => accountIds.traverseU(setOrClearIdentityId(Some(identityId)))
        case None => ClientSuccess(())
      }
    } yield ()
  }
}
