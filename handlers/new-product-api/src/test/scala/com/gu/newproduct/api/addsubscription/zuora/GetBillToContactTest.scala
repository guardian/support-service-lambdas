package com.gu.newproduct.api.addsubscription.zuora

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact.WireModel.{GetBillToResponse, ZuoraContact}
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact._
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class GetBillToContactTest extends FlatSpec with Matchers {

  it should "get contacts" in {

    val billToZuoraContact = ZuoraContact(
      firstName = "billToName",
      lastName = "billToLastName",
      workEmail = None,
      country = Some("United Kingdom")
    )

    val zuoraGet: RequestsGet[GetBillToResponse] = (path, isCheckNeeded) => {
      (path, isCheckNeeded) shouldBe (("accounts/accountId", WithCheck))
      ClientSuccess(GetBillToResponse(billToZuoraContact))
    }

    val expected = Contact(
      FirstName("billToName"),
      LastName("billToLastName"),
      None,
      Some(Country.UK)
    )

    GetBillToContact(zuoraGet)(ZuoraAccountId("accountId")) shouldBe ClientSuccess(expected)
  }
}

