package com.gu.identity

import com.gu.identity.GetByIdentityId.IdentityUser
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import com.gu.util.resthttp.Types.ClientSuccess
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetByIdentityIdTest extends AnyFlatSpec with Matchers {
  it should "formulate a request" in {
    GetByIdentityId.wrapper.fromNewParam(IdentityId("1234")) should be(GetRequest(RelativePath("/user/1234")))
  }

  it should "extract user with password" in {
    val identityResponse: String =
      """
        |{
        |    "status": "ok",
        |    "user": {
        |        "id": "1234",
        |        "hasPassword": true
        |    }
        |}
      """.stripMargin
    val actual = GetByIdentityId.wrapper.toNewResponse(Json.parse(identityResponse))
    actual should be(ClientSuccess(IdentityUser(IdentityId("1234"), hasPassword = true)))
  }

  it should "extract user without password" in {
    val identityResponse: String =
      """
        |{
        |    "status": "ok",
        |    "user": {
        |        "id": "1234",
        |        "hasPassword": false
        |    }
        |}
      """.stripMargin
    val actual = GetByIdentityId.wrapper.toNewResponse(Json.parse(identityResponse))
    actual should be(ClientSuccess(IdentityUser(IdentityId("1234"), hasPassword = false)))
  }
}
