package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.update.UpdateSteps.{maybeClearIdentityIds, maybeSetIdentityIds}
import com.gu.sf_contact_merge.validate.GetContacts.{AccountId, IdentityId}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import scalaz.NonEmptyList
import scalaz.syntax.traverse.ToTraverseOps

object UpdateSteps {

  def apply(
    maybeClearIdentityIds: NonEmptyList[AccountId] => Types.ClientFailableOp[Unit],
    maybeSetIdentityIds: NonEmptyList[AccountId] => Types.ClientFailableOp[Unit],
    updateAccountSFLinks: AccountId => ClientFailableOp[Unit]
  )(
    accountIds: NonEmptyList[AccountId]
  ): ClientFailableOp[Unit] = {
    for {
      _ <- maybeClearIdentityIds(accountIds)
      _ <- accountIds.traverseU(updateAccountSFLinks)
      _ <- maybeSetIdentityIds(accountIds)
    } yield ()
  }

  def maybeSetIdentityIds(
    setOrClearIdentityId: Option[IdentityId] => AccountId => ClientFailableOp[Unit],
    maybeUpdateIdentityId: Option[IdentityId]
  )(accountIds: NonEmptyList[AccountId]): ClientFailableOp[Unit] = {
    maybeUpdateIdentityId match {
      case Some(identityId) => accountIds.traverseU(setOrClearIdentityId(Some(identityId))).map(_ => ())
      case None => ClientSuccess(())
    }
  }

  def maybeClearIdentityIds(
    setOrClearIdentityId: Option[IdentityId] => AccountId => ClientFailableOp[Unit],
    maybeUpdateIdentityId: Option[IdentityId]
  )(accountIds: NonEmptyList[AccountId]): ClientFailableOp[Unit] = {
    if (maybeUpdateIdentityId.isDefined) {
      accountIds.traverseU(setOrClearIdentityId(None)).map(_ => ())
    } else ClientSuccess(())
  }
}

object UpdateStepsWiring { // not sure if having it here rather than Handler is a nice idea

  def apply(
    setOrClearIdentityId: Option[IdentityId] => AccountId => Types.ClientFailableOp[Unit],
    updateAccountSFLinks: AccountId => ClientFailableOp[Unit]
  )(
    maybeUpdateIdentityId: Option[IdentityId]
  ): NonEmptyList[AccountId] => ClientFailableOp[Unit] = {
    val maybeClear = maybeClearIdentityIds(setOrClearIdentityId, maybeUpdateIdentityId) _
    val maybeSet = maybeSetIdentityIds(setOrClearIdentityId, maybeUpdateIdentityId) _
    UpdateSteps(maybeClear, maybeSet, updateAccountSFLinks)
  }

}
