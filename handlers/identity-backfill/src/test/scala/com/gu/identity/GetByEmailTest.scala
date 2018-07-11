package com.gu.identity

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.HTTPResponse
import com.gu.identity.GetByEmail.{NotFound, NotValidated}
import com.gu.identity.GetByEmailTest.{NotFoundTestData, NotValidatedTestData, TestData}
import com.gu.identityBackfill.Types.{EmailAddress, IdentityId}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.{-\/, \/, \/-}

class GetByEmailTest extends FlatSpec with Matchers {

  it should "get successful ok" in {
    val actual = geyByEmailFromResponses(TestData.responses)

    actual should be(\/-(IdentityId("1234")))
  }

  it should "get not validated with an error" in {
    val actual = geyByEmailFromResponses(NotValidatedTestData.responses)

    actual should be(-\/(NotValidated))
  }

  it should "get not found" in {
    val actual = geyByEmailFromResponses(NotFoundTestData.responses)

    actual should be(-\/(NotFound))
  }

  private def geyByEmailFromResponses(responses: Map[String, HTTPResponse]): GetByEmail.ApiError \/ IdentityId = {
    val testingRawEffects = new TestingRawEffects(responses = responses)

    GetByEmail(testingRawEffects.response, IdentityConfig("http://baseurl", "apitoken"))(EmailAddress("email@address"))
  }

}

object GetByEmailTest {

  object TestData {

    def responses: Map[String, HTTPResponse] = Map(
      "/user?emailAddress=email@address" -> HTTPResponse(200, dummyIdentityResponse)
    )

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

    def responses: Map[String, HTTPResponse] = Map(
      "/user?emailAddress=email@address" -> HTTPResponse(200, dummyIdentityResponse)
    )

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

  }

  object NotFoundTestData {

    def responses: Map[String, HTTPResponse] = Map(
      "/user?emailAddress=email@address" -> HTTPResponse(404, dummyIdentityResponse)
    )
    val dummyIdentityResponse: String =
      """
        |{
        |    "status": "error",
        |    "errors": [
        |        {
        |            "message": "Not found",
        |            "description": "Resource not found"
        |        }
        |    ]
        |}
      """.stripMargin

  }

}
