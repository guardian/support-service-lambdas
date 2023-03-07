package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.gu.soft_opt_in_consent_setter.testData.IdentityTestData.{
  failedResponse,
  fakeIdentityConfig,
  successfulResponse,
  thrownResponse,
}
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class IdentityConnectorTests extends AnyFlatSpec with should.Matchers with EitherValues {

  // handleConsentsResp success cases
  "handleConsentsResp" should "return Unit if the the request was successful and the reply is 2xx" in {
    new IdentityConnector(fakeIdentityConfig).handleConsentsResp(successfulResponse) shouldBe Right(())
  }

  // handleConsentsResp failure cases
  "handleConsentsResp" should "return a SoftOptInError if the the request was unsuccessful" in {
    val result = new IdentityConnector(fakeIdentityConfig).handleConsentsResp(thrownResponse)

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
  }

  "handleConsentsResp" should "return a SoftOptInError if the the request was successful but a failure code was received" in {
    val result = new IdentityConnector(fakeIdentityConfig).handleConsentsResp(failedResponse)

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
  }
}
