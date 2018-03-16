package com.gu.identity

import com.gu.effects.TestingRawEffects
import com.gu.identity.GetByEmail.{ EmailAddress, IdentityId }
import org.scalatest.{ FlatSpec, Matchers }

import scalaz.{ \/, \/- }

class GetByEmailTest extends FlatSpec with Matchers {

  it should "get successful ok" in {
    val testingRawEffects = new TestingRawEffects(responses = Map("/user?emailAddress=email@address" -> ((200, TestData.dummyIdentityResponse))))

    val actual: \/[GetByEmail.ApiError, GetByEmail.IdentityId] = GetByEmail(IdentityClientDeps(testingRawEffects.rawEffects.response, IdentityConfig("http://baseurl", "apitoken")))(EmailAddress("email@address"))

    actual should be(\/-(IdentityId("1234")))
  }

}

object TestData {

  val dummyIdentityResponse: String =
    """
      |{
      |    "status": "ok",
      |    "user": {
      |        "id": "1234",
      |        "dates": {
      |            "accountCreatedDate": "2015-03-17T11:09:08Z"
      |        },
      |        "primaryEmailAddress": "john.duffell@guardian.co.uk",
      |        "publicFields": {
      |            "username": "johnduffell2",
      |            "displayName": "johnduffell2",
      |            "vanityUrl": "johnduffell2",
      |            "usernameLowerCase": "johnduffell2"
      |        }
      |    }
      |}
    """.stripMargin

}