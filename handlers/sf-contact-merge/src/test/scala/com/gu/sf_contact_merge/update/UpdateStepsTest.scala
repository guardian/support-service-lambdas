package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, SFPointer}
import com.gu.sf_contact_merge.validate.GetContacts
import com.gu.sf_contact_merge.validate.GetContacts.{AccountId, IdentityId, SFContactId}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}
import scalaz.NonEmptyList

class UpdateStepsTest extends FlatSpec with Matchers {

  it should "not edit identity id at all if we're not setting one" in {

    var order = List[String]()

    def setOrClearIdentityId(sfContactId: SFContactId, idid: Option[GetContacts.IdentityId]): Types.ClientFailableOp[Unit] = {
      order = (idid match {
        case None => s"clear ${sfContactId.value}"
        case Some(IdentityId("newIdentityId")) => "addidentity"
        case Some(IdentityId(other)) => s"try to set identity id to: <$other>"
      }) :: order
      ClientSuccess(())
    }

    def updateAccountSFLinks(SFPointer: SFPointer)(acId: GetContacts.AccountId): Types.ClientFailableOp[Unit] = {
      acId should be(AccountId("account1"))
      order = "doLink" :: order
      ClientSuccess(())
    }

    val wired = UpdateSteps((setOrClearIdentityId _).tupled, updateAccountSFLinks) _

    val accountIds: NonEmptyList[GetContacts.AccountId] =
      NonEmptyList(AccountId("account1"))

    val maybeIdentityId: Option[GetContacts.IdentityId] = None
    val sfPointer = SFPointer(SFContactId("contnew"), CRMAccountId("crmcrm"), maybeIdentityId)
    val maybeContactId = Some(SFContactId("contold"))

    val actual = wired(sfPointer, maybeContactId, accountIds)

    order.reverse should be(List("doLink", "clear contold"))
    actual should be(ClientSuccess(()))
  }

  it should "clear and then set identity id if we're setting one" in {

    var order = List[String]()

    def setOrClearIdentityId(sfContactId: SFContactId, idid: Option[GetContacts.IdentityId]): Types.ClientFailableOp[Unit] = {
      order = (idid match {
        case None => "clear"
        case Some(IdentityId("newIdentityId")) => s"addidentity ${sfContactId.value}"
        case Some(IdentityId(other)) => s"try to set identity id to: <$other>"
      }) :: order
      ClientSuccess(())
    }

    val maybeIdentityId: Option[GetContacts.IdentityId] = Some(IdentityId("newIdentityId"))

    val sfPointer = SFPointer(SFContactId("contnew"), CRMAccountId("crmcrm"), maybeIdentityId)

    def updateAccountSFLinks(actualSFPointer: SFPointer)(acId: GetContacts.AccountId): Types.ClientFailableOp[Unit] = {
      actualSFPointer should be(sfPointer)
      acId should be(AccountId("account1"))
      order = "doLink" :: order
      ClientSuccess(())
    }

    val wired = UpdateSteps((setOrClearIdentityId _).tupled, updateAccountSFLinks) _

    val accountIds: NonEmptyList[GetContacts.AccountId] =
      NonEmptyList(AccountId("account1"))

    val maybeContactId = Some(SFContactId("contold"))

    val actual = wired(sfPointer, maybeContactId, accountIds)

    order.reverse should be(List("doLink", "clear", "addidentity contnew"))
    actual should be(ClientSuccess(()))
  }

}
