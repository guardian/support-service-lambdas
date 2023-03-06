package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.{GetContactsResponse, ZuoraBillTo}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{WireModel, _}
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetContactsTest extends AnyFlatSpec with Matchers {

  it should "get contacts" in {

    val soldToZuoraContact = WireModel.ZuoraSoldTo(
      Title__c = Some("Dr"),
      firstName = "Emmett",
      lastName = "Brown",
      workEmail = Some("doc@email.com"),
      address1 = Some("1640"),
      address2 = Some("Riverside Drive"),
      city = Some("Hill Valley"),
      state = Some("California"),
      zipCode = Some("95420"),
      country = "United States",
    )
    val billToZuoraContact = ZuoraBillTo(
      Title__c = Some("Mr"),
      firstName = "Marty",
      lastName = "McFly",
      workEmail = Some("marty@email.com"),
      address1 = Some("9303 Lyon Drive"),
      address2 = Some("Lyon Estates"),
      city = Some("Hill Valley"),
      state = Some("California"),
      zipCode = Some("95423"),
      country = Some("USA"),
    )

    val zuoraGet: RequestsGet[GetContactsResponse] = (path, isCheckNeeded) => {
      (path, isCheckNeeded) shouldBe (("accounts/accountId", WithCheck))
      ClientSuccess(GetContactsResponse(billToZuoraContact, soldToZuoraContact))
    }

    val expected = Contacts(
      soldTo = SoldToContact(
        Some(Title("Dr")),
        FirstName("Emmett"),
        LastName("Brown"),
        Some(Email("doc@email.com")),
        SoldToAddress(
          Some(Address1("1640")),
          Some(Address2("Riverside Drive")),
          Some(City("Hill Valley")),
          Some(State("California")),
          Country.US,
          Some(Postcode("95420")),
        ),
      ),
      billTo = BillToContact(
        Some(Title("Mr")),
        FirstName("Marty"),
        LastName("McFly"),
        Some(Email("marty@email.com")),
        BillToAddress(
          Some(Address1("9303 Lyon Drive")),
          Some(Address2("Lyon Estates")),
          Some(City("Hill Valley")),
          Some(State("California")),
          Some(Country.US),
          Some(Postcode("95423")),
        ),
      ),
    )

    GetContacts(zuoraGet)(ZuoraAccountId("accountId")) shouldBe ClientSuccess(expected)
  }
}
