package com.gu.identity

import com.gu.identity.GetByEmail.IdentityAccount
import com.gu.identity.GetByEmailTest.{NotValidatedTestData, TestData}
import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.RestRequestMaker.{GetRequestWithParams, RelativePath, UrlParams}
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

class GetByEmailTest extends FlatSpec with Matchers {

  it should "formulate a request" in {
    val actual = GetByEmail.wrapper.fromNewParam(EmailAddress("email@address"))

    actual should be(GetRequestWithParams(RelativePath("/user"), UrlParams(Map("emailAddress" -> "email@address"))))
  }

  it should "get successful ok" in {
    val actual = GetByEmail.wrapper.toNewResponse(Json.parse(TestData.dummyIdentityResponse))

    actual should be(ClientSuccess(IdentityAccount(IdentityId("1234"), isUserEmailValidated = true)))
  }

  it should "get not validated with an error" in {
    val actual = GetByEmail.wrapper.toNewResponse(Json.parse(NotValidatedTestData.dummyIdentityResponse))

    actual should be(ClientSuccess(IdentityAccount(IdentityId("1234"), isUserEmailValidated = false)))
  }

  it should "get not validated if the response has no statusFields" in {
    val actual = GetByEmail.wrapper.toNewResponse(Json.parse(NotValidatedTestData.identityResponseWithoutStatus))
    actual should be(ClientSuccess(IdentityAccount(IdentityId("1234"), isUserEmailValidated = false)))
  }
}

object GetByEmailTest {

  object TestData {

    val dummyIdentityResponse: String =
      """
        |{
        |    "status": "ok",
        |    "user": {
        |        "dates": {
        |            "lastActivityDate": "2016-06-10T10:11:25.610Z",
        |            "accountCreatedDate": "2015-03-17T11:09:08.000Z"
        |        },
        |        "publicFields": {
        |            "username": "johnduffell2",
        |            "vanityUrl": "johnduffell2",
        |            "displayName": "johnduffell2",
        |            "usernameLowerCase": "johnduffell2"
        |        },
        |        "statusFields": {
        |            "userEmailValidated": true
        |        },
        |        "primaryEmailAddress": "john.duffell@guardian.co.uk",
        |        "id": "1234"
        |    }
        |}
      """.stripMargin

  }

  object NotValidatedTestData {

    val dummyIdentityResponse: String =
      """
        |{
        |    "status": "ok",
        |    "user": {
        |        "dates": {
        |            "lastActivityDate": "2016-06-10T10:11:25.610Z",
        |            "accountCreatedDate": "2015-03-17T11:09:08.000Z"
        |        },
        |        "publicFields": {
        |            "username": "johnduffell2",
        |            "vanityUrl": "johnduffell2",
        |            "displayName": "johnduffell2",
        |            "usernameLowerCase": "johnduffell2"
        |        },
        |        "statusFields": {
        |            "userEmailValidated": false
        |        },
        |        "primaryEmailAddress": "john.duffell@guardian.co.uk",
        |        "id": "1234"
        |    }
        |}
      """.stripMargin

    val identityResponseWithoutStatus: String =
      """
        |{
        |    "status": "ok",
        |    "user": {
        |        "id": "1234"
        |    }
        |}
      """.stripMargin

  }

}
