package com.gu.salesforce.auth

import com.gu.effects.{SFTestEffects, TestingRawEffects}
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.salesforce.SalesforceAuthenticate
import com.gu.salesforce.SalesforceClient.SalesforceErrorResponseBody
import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SalesforceAuthenticateTest extends AnyFlatSpec with Matchers {

  it should "get auth SF correctly" in {
    val effects = new TestingRawEffects(postResponses = SalesforceAuthenticateData.postResponses)
    val auth = SalesforceAuthenticate
      .auth(
        effects.response,
        SFAuthConfig(
          "https://sfurl.haha",
          "clientsfclient",
          "clientsecretsfsecret",
          "usernamesf",
          "passSFpassword",
          "tokentokenSFtoken",
        ),
      )
    val expected = Right(SalesforceAuth("tokentoken", "https://instance.url"))
    auth should be(expected)
  }

  it should "parse a password auth failure alright" in {
    val effects = new TestingRawEffects(postResponses = Map(SFTestEffects.authFailure))
    val auth = SalesforceAuthenticate
      .auth(
        effects.response,
        SFAuthConfig(
          "https://sfurl.haha",
          "clientsfclient",
          "clientsecretsfsecret",
          "usernamesf",
          "passSFpassword",
          "tokentokenSFtoken",
        ),
      )
    val expected = Left(List(SalesforceErrorResponseBody("The users password has expired, you must call SetPassword before attempting any other API operations", "INVALID_OPERATION_WITH_EXPIRED_PASSWORD")))
    auth should be(expected)
  }

}

object SalesforceAuthenticateData {
  def postResponses: Map[POSTRequest, HTTPResponse] = Map(SFTestEffects.authSuccess)
}
