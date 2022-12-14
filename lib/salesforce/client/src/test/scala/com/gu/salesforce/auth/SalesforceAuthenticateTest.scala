package com.gu.salesforce.auth

import com.gu.effects.{SFTestEffects, TestingRawEffects}
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.salesforce.SalesforceAuthenticate
import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class SalesforceAuthenticateTest extends AnyFlatSpec with Matchers {

  it should "get auth SF correctly" in {
    val effects = new TestingRawEffects(postResponses = SalesforceAuthenticateData.postResponses)
    val auth = SalesforceAuthenticate
      .apply(effects.response)(
        SFAuthConfig(
          "https://sfurl.haha",
          "clientsfclient",
          "clientsecretsfsecret",
          "usernamesf",
          "passSFpassword",
          "tokentokenSFtoken",
        ),
      )
      .value
    val expected = ClientSuccess(SalesforceAuth("tokentoken", "https://instance.url"))
    auth should be(expected)
  }
}

object SalesforceAuthenticateData {
  def postResponses: Map[POSTRequest, HTTPResponse] = Map(SFTestEffects.authSuccess)
}
