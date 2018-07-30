package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.validate.GetContacts
import com.gu.sf_contact_merge.validate.GetContacts.{AccountId, IdentityId}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}
import scalaz.NonEmptyList

class UpdateStepsTest extends FlatSpec with Matchers {

  it should "not edit identity id at all if we're not setting one" in {

    def setOrClearIdentityId(idid: Option[GetContacts.IdentityId])(acId: GetContacts.AccountId): Types.ClientFailableOp[Unit] =
      fail("should not be trying to update identity ids when not specified")

    def updateAccountSFLinks(acId: GetContacts.AccountId): Types.ClientFailableOp[Unit] = {
      acId should be(AccountId("account1"))
      ClientSuccess(())
    }

    val wired = UpdateSteps(setOrClearIdentityId, updateAccountSFLinks) _

    val accountIds: NonEmptyList[GetContacts.AccountId] =
      NonEmptyList(AccountId("account1"))

    val maybeIdentityId: Option[GetContacts.IdentityId] = None

    val actual = wired(accountIds, maybeIdentityId)

    actual should be(ClientSuccess(()))
  }

  it should "clear and then set identity id if we're setting one" in {

    var order = List[String]()

    def setOrClearIdentityId(idid: Option[GetContacts.IdentityId])(acId: GetContacts.AccountId): Types.ClientFailableOp[Unit] = {
      acId should be(AccountId("account1"))
      order = (idid match {
        case None => "clear"
        case Some(IdentityId("newIdentityId")) => "addidentity"
        case Some(IdentityId(other)) => s"try to set identity id to: <$other>"
      }) :: order
      ClientSuccess(())
    }

    def updateAccountSFLinks(acId: GetContacts.AccountId): Types.ClientFailableOp[Unit] = {
      acId should be(AccountId("account1"))
      order = "doLink" :: order
      ClientSuccess(())
    }

    val wired = UpdateSteps(setOrClearIdentityId, updateAccountSFLinks) _

    val accountIds: NonEmptyList[GetContacts.AccountId] =
      NonEmptyList(AccountId("account1"))

    val maybeIdentityId: Option[GetContacts.IdentityId] = Some(IdentityId("newIdentityId"))

    val actual = wired(accountIds, maybeIdentityId)

    order.reverse should be(List("clear", "doLink", "addidentity"))
    actual should be(ClientSuccess(()))
  }

}
