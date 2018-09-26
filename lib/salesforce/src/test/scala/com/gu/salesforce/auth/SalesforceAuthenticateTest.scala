package com.gu.salesforce.auth

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.salesforce.SalesforceAuthenticate
import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SalesforceAuth}
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class SalesforceAuthenticateTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" in {
    val effects = new TestingRawEffects(postResponses = SalesforceAuthenticateData.postResponses)
    val auth = SalesforceAuthenticate.apply(effects.response)(SFAuthConfig(
      "https://sfurl.haha",
      "clientsfclient",
      "clientsecretsfsecret",
      "usernamesf",
      "passSFpassword",
      "tokentokenSFtoken"
    )).value
    val expected = ClientSuccess(SalesforceAuth("tokentoken", "https://instance.url"))
    auth should be(expected)

  }

}

object SalesforceAuthenticateData {

  def postResponses: Map[POSTRequest, HTTPResponse] = {

    val accountQueryResponse: String =
      s"""
         |{
         |    "access_token": "tokentoken",
         |    "instance_url": "https://instance.url",
         |    "id": "https://id.sf.com/id/idididididid/ididididid",
         |    "token_type": "Bearer",
         |    "issued_at": "101010101010",
         |    "signature": "bW9uc3RlcnMhCg=="
         |}
    """.stripMargin

    Map(
      POSTRequest("/services/oauth2/token", """client_id=clientsfclient&client_secret=clientsecretsfsecret&username=usernamesf&password=passSFpasswordtokentokenSFtoken&grant_type=password""")
        -> HTTPResponse(200, accountQueryResponse)
    )
  }

}
