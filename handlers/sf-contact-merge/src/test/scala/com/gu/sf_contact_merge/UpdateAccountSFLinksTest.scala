package com.gu.sf_contact_merge

import com.gu.sf_contact_merge.GetZuoraEmailsForAccounts.AccountId
import com.gu.zuora.fake.FakeRequestsPut
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json._
import scalaz.\/-

class UpdateAccountSFLinksTest extends FlatSpec with Matchers {

  it should "handle an email and a missing email with a fake querier" in {

    val expectedUrl = """accounts/1234"""

    val response = JsObject(Map("Success" -> JsBoolean(true)))
    val expectedInput = Json.parse(
      """
        |{
        |    "sfContactId__c": "johnjohn_c",
        |    "crmId": "crmIdjohn"
        |    }
      """.stripMargin
    )

    val (requestsMade, fakePutter) = FakeRequestsPut(expectedUrl, expectedInput, response)
    val operation = UpdateAccountSFLinks(fakePutter)_
    val actual = operation(
      "crmIdjohn",
      "johnjohn_c"
    )(AccountId("1234"))

    actual should be(\/-(()))
    requestsMade() should be(List(expectedInput))

  }

}

