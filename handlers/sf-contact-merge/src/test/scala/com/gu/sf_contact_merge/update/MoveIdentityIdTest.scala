package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.sf_contact_merge.update.MoveIdentityId.OldSFContact
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, LinksFromZuora}
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{IdentityId, SFContactUpdate}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class MoveIdentityIdTest extends FlatSpec with Matchers {

  it should "not edit identity id at all if we're not setting one" in {

    var order = List[String]()

    def setOrClearIdentityId(sfContactId: SFContactId, idid: Option[SFContactUpdate]): Types.ClientFailableOp[Unit] = {
      order = (idid match {
        case None => s"clear ${sfContactId.value}"
        case Some(SFContactUpdate(IdentityId("newIdentityId"), FirstName("hello"))) => "addidentity"
        case Some(other) => s"try to set identity id to: <$other>"
      }) :: order
      ClientSuccess(())
    }

    val maybeIdentityId: Option[IdentityId] = None
    val sfPointer = LinksFromZuora(SFContactId("contnew"), CRMAccountId("crmcrm"), maybeIdentityId)
    val maybeContactId = Some(OldSFContact(SFContactId("contold")))

    val actual = MoveIdentityId(setOrClearIdentityId)(sfPointer, maybeContactId, FirstName("hello"))

    order.reverse should be(List("clear contold"))
    actual should be(ClientSuccess(()))
  }

  it should "clear and then set identity id if we're setting one" in {

    var order = List[String]()

    def setOrClearIdentityId(sfContactId: SFContactId, idid: Option[SFContactUpdate]): Types.ClientFailableOp[Unit] = {
      order = (idid match {
        case None => "clear"
        case Some(SFContactUpdate(IdentityId("newIdentityId"), FirstName("hello"))) => s"addidentity ${sfContactId.value}"
        case Some(other) => s"try to set identity id to: <$other>"
      }) :: order
      ClientSuccess(())
    }

    val maybeIdentityId: Option[IdentityId] = Some(IdentityId("newIdentityId"))

    val sfPointer = LinksFromZuora(SFContactId("contnew"), CRMAccountId("crmcrm"), maybeIdentityId)

    val maybeContactId = Some(OldSFContact(SFContactId("contold")))

    val actual = MoveIdentityId(setOrClearIdentityId)(sfPointer, maybeContactId, FirstName("hello"))

    order.reverse should be(List("clear", "addidentity contnew"))
    actual should be(ClientSuccess(()))
  }

}
