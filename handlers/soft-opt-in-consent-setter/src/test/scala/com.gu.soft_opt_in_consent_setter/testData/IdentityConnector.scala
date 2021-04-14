package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.IdentityConnector
import com.gu.soft_opt_in_consent_setter.models.IdentityConfig
import com.gu.soft_opt_in_consent_setter.testData.HTTP.getRunRequest

object IdentityConnector {
  val fakeIdentityConfig = IdentityConfig("url", "token")

  val identityConnector_withSuccessfulResponse = new IdentityConnector(fakeIdentityConfig, getRunRequest(body = ""))
  val identityConnector_withFailedResponse = new IdentityConnector(fakeIdentityConfig, getRunRequest(body = "", forceThrow = true))

}
