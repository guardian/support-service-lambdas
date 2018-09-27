package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, FirstName}
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFAddress
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFAddressFields._
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddressOverride.{DontOverrideAddress, OverrideAddressWith}
import com.gu.sf_contact_merge.update.UpdateSFContacts.OldSFContact
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{IdentityId, SFContactUpdate, SetFirstName}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class UpdateSFContactsTest extends FlatSpec with Matchers {

  final class MockSetOrClearIdentityId() {

    var invocationLog = List[String]() // we want to check ordering of side effects...

    def apply(sfContactId: SFContactId, sfUpdateRequest: SFContactUpdate): Types.ClientFailableOp[Unit] = {
      invocationLog = invocationLog ++ List(sfUpdateRequest match {
        case SFContactUpdate(None, setname, DontOverrideAddress, email) =>
          s"clear ${sfContactId.value} setname: $setname" + email.map(email => s", setemail ${email.value}").getOrElse("")
        case SFContactUpdate(None, setname, OverrideAddressWith(a), email) =>
          s"clear ${sfContactId.value} setname: $setname, setaddress" + email.map(email => s", setemail ${email.value}").getOrElse("")
        case SFContactUpdate(Some(IdentityId("newIdentityId")), SetFirstName(FirstName(name)), OverrideAddressWith(a), email) =>
          s"addidentity ${sfContactId.value} setname $name, setaddress" + email.map(email => s", setemail ${email.value}").getOrElse("")
        case other =>
          s"try to set identity id to: <$other>"
      })
      ClientSuccess(())
    }

  }

  it should "not edit identity id at all if we're not setting one" in {

    val invocationLog = new MockSetOrClearIdentityId()

    val maybeIdentityId: Option[IdentityId] = None
    val maybeContactId = Some(OldSFContact(SFContactId("contold")))

    val actual = UpdateSFContacts(SetOrClearIdentityId(invocationLog.apply))(
      SFContactId("contnew"),
      maybeIdentityId,
      maybeContactId,
      Some(FirstName("hello")),
      DontOverrideAddress,
      None
    )

    val expectedOrder = List(
      "clear contold setname: DontChangeFirstName",
      "clear contnew setname: SetFirstName(FirstName(hello))"
    )
    invocationLog.invocationLog should be(expectedOrder)
    actual should be(ClientSuccess(()))
  }

  it should "clear and then set identity id if we're setting one" in {

    val mockSetOrClearIdentityId = new MockSetOrClearIdentityId()

    val maybeIdentityId: Option[IdentityId] = Some(IdentityId("newIdentityId"))

    val maybeContactId = Some(OldSFContact(SFContactId("contold")))

    val actual = UpdateSFContacts(SetOrClearIdentityId(mockSetOrClearIdentityId.apply))(
      SFContactId("contnew"),
      maybeIdentityId,
      maybeContactId,
      Some(FirstName("hello")),
      OverrideAddressWith(SFAddress(
        SFStreet("street1"),
        Some(SFCity("city1")),
        Some(SFState("state2")),
        Some(SFPostalCode("post1")),
        SFCountry("country1"),
        Some(SFPhone("phone1"))
      )),
      Some(EmailAddress("email@email.com"))
    )

    val expectedOrder = List(
      "clear contold setname: DontChangeFirstName",
      "addidentity contnew setname hello, setaddress, setemail email@email.com"
    )
    mockSetOrClearIdentityId.invocationLog should be(expectedOrder)
    actual should be(ClientSuccess(()))
  }

  it should "not clear or set identity id if we aren't setting it" in {

    val mockSetOrClearIdentityId = new MockSetOrClearIdentityId()

    val maybeIdentityId: Option[IdentityId] = None

    val maybeContactId = None

    val actual = UpdateSFContacts(SetOrClearIdentityId(mockSetOrClearIdentityId.apply))(
      SFContactId("contnew"),
      maybeIdentityId,
      maybeContactId,
      Some(FirstName("hello")),
      DontOverrideAddress,
      None
    )

    val expectedOrder = List(
      "clear contnew setname: SetFirstName(FirstName(hello))"
    )
    mockSetOrClearIdentityId.invocationLog should be(expectedOrder)
    actual should be(ClientSuccess(()))
  }

}
