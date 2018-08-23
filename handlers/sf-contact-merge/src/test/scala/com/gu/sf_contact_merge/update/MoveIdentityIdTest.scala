package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.sf_contact_merge.update.MoveIdentityId.OldSFContact
import com.gu.sf_contact_merge.update.UpdateAccountSFLinks.{CRMAccountId, LinksFromZuora}
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{IdentityId, SFContactUpdate, SetFirstName}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class MoveIdentityIdTest extends FlatSpec with Matchers {

  final class Var() {

    var order = List[String]() // we want to check ordering of side effects...

    def setOrClearIdentityId(sfContactId: SFContactId, sfUpdateRequest: SFContactUpdate): Types.ClientFailableOp[Unit] = {
      order = (sfUpdateRequest match {
        case SFContactUpdate(None, setname) => s"clear ${sfContactId.value} setname: $setname"
        case SFContactUpdate(Some(IdentityId("newIdentityId")), SetFirstName(FirstName(name))) => s"addidentity ${sfContactId.value} setname $name"
        case other => s"try to set identity id to: <$other>"
      }) :: order
      ClientSuccess(())
    }

  }

  it should "not edit identity id at all if we're not setting one" in {

    val mock = new Var()

    val maybeIdentityId: Option[IdentityId] = None
    val sfPointer = LinksFromZuora(SFContactId("contnew"), CRMAccountId("crmcrm"), maybeIdentityId)
    val maybeContactId = Some(OldSFContact(SFContactId("contold")))

    val actual = MoveIdentityId(mock.setOrClearIdentityId)(sfPointer, maybeContactId, Some(FirstName("hello")))

    mock.order.reverse should be(List("clear contold setname: DontChangeFirstName", "clear contnew setname: SetFirstName(FirstName(hello))"))
    actual should be(ClientSuccess(()))
  }

  it should "clear and then set identity id if we're setting one" in {

    val mock = new Var()

    val maybeIdentityId: Option[IdentityId] = Some(IdentityId("newIdentityId"))

    val sfPointer = LinksFromZuora(SFContactId("contnew"), CRMAccountId("crmcrm"), maybeIdentityId)

    val maybeContactId = Some(OldSFContact(SFContactId("contold")))

    val actual = MoveIdentityId(mock.setOrClearIdentityId)(sfPointer, maybeContactId, Some(FirstName("hello")))

    mock.order.reverse should be(List("clear contold setname: DontChangeFirstName", "addidentity contnew setname hello"))
    actual should be(ClientSuccess(()))
  }

  it should "not clear or set identity id if we aren't setting it" in {

    val mock = new Var()

    val maybeIdentityId: Option[IdentityId] = None

    val sfPointer = LinksFromZuora(SFContactId("contnew"), CRMAccountId("crmcrm"), maybeIdentityId)

    val maybeContactId = None

    val actual = MoveIdentityId(mock.setOrClearIdentityId)(sfPointer, maybeContactId, Some(FirstName("hello")))

    mock.order.reverse should be(List("clear contnew setname: SetFirstName(FirstName(hello))"))
    actual should be(ClientSuccess(()))
  }

}
