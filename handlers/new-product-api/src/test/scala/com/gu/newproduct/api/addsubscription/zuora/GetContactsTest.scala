package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.{GetContactsResponse, ZuoraBillTo}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{WireModel, _}
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class GetContactsTest extends FlatSpec with Matchers {

  it should "get contacts" in {

    val soldToZuoraContact = WireModel.ZuoraSoldTo(
      firstName = "soldToName",
      lastName = "soldToLastName",
      workEmail = Some("work@email.com"),
      country = "United States"
    )
    val billToZuoraContact = ZuoraBillTo(
      firstName = "billToName",
      lastName = "billToLastName",
      workEmail = None,
      country = Some("United Kingdom")
    )

    val zuoraGet: RequestsGet[GetContactsResponse] = (path, isCheckNeeded) => {
      (path, isCheckNeeded) shouldBe (("accounts/accountId", WithCheck))
      ClientSuccess(GetContactsResponse(billToZuoraContact, soldToZuoraContact))
    }

    val expected = Contacts(
      billTo = BilltoContact(
        FirstName("billToName"),
        LastName("billToLastName"),
        None,
        Some(Country.UK)
      ),
      soldTo = SoldToContact(
        FirstName("soldToName"),
        LastName("soldToLastName"),
        Some(Email("work@email.com")),
        Country.US
      )
    )

    GetContacts(zuoraGet)(ZuoraAccountId("accountId")) shouldBe ClientSuccess(expected)
  }
}

