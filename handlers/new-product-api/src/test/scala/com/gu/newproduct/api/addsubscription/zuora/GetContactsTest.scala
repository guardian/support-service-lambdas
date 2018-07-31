package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.WireModel.{ZuoraContact, ZuoraContacts}
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class GetContactsTest extends FlatSpec with Matchers {

  val billToZuoraContact = ZuoraContact(
    firstName = "billToName",
    lastName = "billToLastName",
    workEmail = None,
    country = Some("United Kingdom")

  )

  val soldToZuoraContact = ZuoraContact(
    firstName = "soldToName",
    lastName = "soldToLastName",
    workEmail = Some("soldTo@email.com"),
    country = Some("United Kingdom")
  )

  it should "get contacts" in {
    val zuoraGet: RequestsGet[ZuoraContacts] = (path, isCheckNeeded) => {
      (path, isCheckNeeded) shouldBe (("accounts/accountId", WithCheck))
      ClientSuccess(ZuoraContacts(billToContact = billToZuoraContact, soldToContact = soldToZuoraContact))
    }

    val expectedContacts = Contacts(
      billTo = Contact(
        FirstName("billToName"),
        LastName("billToLastName"),
        None,
        Some(Country.UK)
      ),
      soldTo = Contact(
        FirstName("soldToName"),
        LastName("soldToLastName"),
        Some(Email("soldTo@email.com")),
        Some(Country.UK)
      )
    )
    GetContacts(zuoraGet)(ZuoraAccountId("accountId")) shouldBe ClientSuccess(expectedContacts)
  }
}

