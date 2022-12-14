package com.gu.identity

import com.gu.identity.CreateGuestAccount.{WireGuestRegistrationResponse, WireIdentityResponse}
import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.RestRequestMaker.{PostRequest, RelativePath}
import play.api.libs.json.{JsObject, JsString}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CreateGuestAccountTest extends AnyFlatSpec with Matchers {

  it should "create a request ok" in {
    val actual = CreateGuestAccount.toRequest(EmailAddress("hello@gu.com"))

    val expected =
      new PostRequest(JsObject(List("primaryEmailAddress" -> JsString("hello@gu.com"))), RelativePath("/guest"))
    actual should be(expected)
  }

  it should "crate a response ok" in {
    val expected = IdentityId("useridhere")
    val testData = WireIdentityResponse("ok", WireGuestRegistrationResponse("useridhere"))
    val actual = CreateGuestAccount.toResponse(testData)
    actual should be(expected)
  }

}
