package com.gu.soft_opt_in_consent_setter.testData

import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import com.gu.soft_opt_in_consent_setter.SalesforceConnector
import com.gu.soft_opt_in_consent_setter.testData.HTTP.getRunRequest

object SalesforceConnector {
  val fakeAccessToken = "access_token"
  val fakeInstanceUrl = "url.com"
  val fakeSfConfig = SFAuthConfig("url", "id", "secret", "username", "password", "token")

  val fakeAuthDetails: SalesforceAuth = SalesforceAuth(fakeAccessToken, fakeInstanceUrl)
  val salesforceConnector = new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest(body = ""))

  val fakeAuthResponse = s"""{
       | "access_token": "$fakeAccessToken",
       | "instance_url": "$fakeInstanceUrl"
       |}""".stripMargin

}
