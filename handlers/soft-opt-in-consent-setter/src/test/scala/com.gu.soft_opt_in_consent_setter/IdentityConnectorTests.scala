package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.gu.soft_opt_in_consent_setter.testData.HTTP.getRunRequest
import com.gu.soft_opt_in_consent_setter.testData.IdentityConnector.fakeIdentityConfig
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class IdentityConnectorTests extends AnyFlatSpec with should.Matchers with EitherValues {

  // sendConsentsReq success cases
  "sendConsentsReq" should "return Unit if the the request was successful and the reply is 2xx" in {
    new IdentityConnector(fakeIdentityConfig, getRunRequest(body = "")).sendConsentsReq("identityID", "body") shouldBe Right(())
  }

  // sendConsentsReq failure cases
  "sendConsentsReq" should "return a SoftOptInError if the the request was unsuccessful" in {
    val result = new IdentityConnector(fakeIdentityConfig, getRunRequest(body = "", forceThrow = true)).sendConsentsReq("identityID", "body")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "IdentityConnector"
  }

  "sendConsentsReq" should "return a SoftOptInError if the the request was successful but a failure code was received" in {
    val result = new IdentityConnector(fakeIdentityConfig, getRunRequest(body = "", statusCode = 400)).sendConsentsReq("identityID", "body")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "IdentityConnector"
  }
}
