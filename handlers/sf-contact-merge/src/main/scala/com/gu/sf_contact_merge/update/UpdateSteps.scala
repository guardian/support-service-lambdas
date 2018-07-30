package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.TypeConvert._
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.SFPointer
import com.gu.sf_contact_merge.validation.GetContacts.{AccountId, IdentityId}
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientFailableOp
import scalaz.NonEmptyList
import scalaz.syntax.traverse.ToTraverseOps

object UpdateSteps {
  def apply(
    setOrClearIdentityId: Option[IdentityId] => AccountId => Types.ClientFailableOp[Unit],
    updateAccountSFLinks: SFPointer => AccountId => ClientFailableOp[Unit]
  )(
    accountIds: NonEmptyList[AccountId],
    sFPointer: SFPointer,
    maybeUpdateIdentityId: Option[IdentityId]
  ): ApiGatewayOp[Unit] = {
    val updateAccount = updateAccountSFLinks(sFPointer)
    for {
      _ <- if (maybeUpdateIdentityId.isDefined) {
        accountIds.traverseU(setOrClearIdentityId(None)).toApiGatewayOp("clearing the identity ids to avoid incorrect sync")
      } else ContinueProcessing(())
      _ <- accountIds.traverseU(updateAccount).toApiGatewayOp("updating all the accounts")
      _ <- maybeUpdateIdentityId match {
        case Some(identityId) => accountIds.traverseU(setOrClearIdentityId(Some(identityId))).toApiGatewayOp("putting the identity id on all the merged accounts")
        case None => ContinueProcessing(())
      }
    } yield ()
  }
}
