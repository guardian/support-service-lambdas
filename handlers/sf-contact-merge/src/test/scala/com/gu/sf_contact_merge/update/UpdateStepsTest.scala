package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.getaccounts.GetContacts
import com.gu.sf_contact_merge.getaccounts.GetContacts.{AccountId, IdentityId, SFContactId}
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, LinksFromZuora}
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

    def updateAccountSFLinks(SFPointer: LinksFromZuora)(acId: GetContacts.AccountId): Types.ClientFailableOp[Unit] = {
      acId should be(AccountId("account1"))
      order = "doLink" :: order
      ClientSuccess(())
    }

    val accountIds: NonEmptyList[GetContacts.AccountId] =
      NonEmptyList(AccountId("account1"))

    val maybeIdentityId: Option[GetContacts.IdentityId] = None
    val sfPointer = LinksFromZuora(SFContactId("contnew"), CRMAccountId("crmcrm"), maybeIdentityId)
    val maybeContactId = Some(SFContactId("contold"))

    val actual = UpdateSteps((setOrClearIdentityId _).tupled, updateAccountSFLinks, sfPointer, maybeContactId, accountIds)

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

    val sfPointer = LinksFromZuora(SFContactId("contnew"), CRMAccountId("crmcrm"), maybeIdentityId)

    def updateAccountSFLinks(actualSFPointer: LinksFromZuora)(acId: GetContacts.AccountId): Types.ClientFailableOp[Unit] = {
      actualSFPointer should be(sfPointer)
      acId should be(AccountId("account1"))
      order = "doLink" :: order
      ClientSuccess(())
    }

    val accountIds: NonEmptyList[GetContacts.AccountId] =
      NonEmptyList(AccountId("account1"))

    val maybeContactId = Some(SFContactId("contold"))

    val actual = UpdateSteps((setOrClearIdentityId _).tupled, updateAccountSFLinks, sfPointer, maybeContactId, accountIds)

    order.reverse should be(List("doLink", "clear", "addidentity contnew"))
    actual should be(ClientSuccess(()))
  }

}
