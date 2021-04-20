package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.gu.soft_opt_in_consent_setter.testData.HTTP.getRunRequest
import com.gu.soft_opt_in_consent_setter.testData.SalesforceTestData.{fakeAuthDetails, fakeAuthResponse, fakeSfConfig}
import com.gu.soft_opt_in_consent_setter.testData.SfSubscription._
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class SalesforceConnectorTests extends AnyFlatSpec with should.Matchers with EitherValues {

  // auth success cases
  "auth" should "returns authentication details on a successful request" in {
    SalesforceConnector.auth(fakeSfConfig, getRunRequest(fakeAuthResponse)) shouldBe Right(fakeAuthDetails)
  }

  // auth failure cases
  "auth" should "returns a SoftOptInError on an unsuccessful request" in {
    val result = SalesforceConnector.auth(fakeSfConfig, getRunRequest(fakeAuthResponse, forceThrow = true))

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "auth" should "returns a SoftOptInError if an unexpected body is found" in {
    val result = SalesforceConnector.auth(fakeSfConfig, getRunRequest("broken body"))

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "doSfGetWithQuery" should "return the body on a successful request" in {
    new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest("this body")).doSfGetWithQuery("query") shouldBe Right("this body")
  }

  "doSfGetWithQuery" should "return a SoftOptInError on an unsuccessful request" in {
    val result = new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest("this body", forceThrow = true)).doSfGetWithQuery("query")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "doSfCompositeRequest" should "return the body on a successful request" in {
    new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest("this body")).doSfCompositeRequest("body") shouldBe Right("this body")
  }

  "doSfCompositeRequest" should "return a SoftOptInError on an unsuccessful request" in {
    val result = new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest("this body", forceThrow = true)).doSfCompositeRequest("body")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "getSfSubs" should "return the body on a successful request" in {
    new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest(fakeSfSubsResponse)).getSfSubs() shouldBe Right(fakeSfSubs)
  }

  "getSfSubs" should "return a SoftOptInError if an unexpected body is found" in {
    val result = new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest("broken body")).getSfSubs()

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "getActiveSubs" should "return AssociatedSFSubscription.Response with empty record list when no identity ids provided" in {
    new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest("")).getActiveSubs(Seq[String]()) shouldBe Right(fakeAssociatedSfSubs)
  }

  "getActiveSubs" should "return AssociatedSFSubscription.Response when identity ids provided" in {
    new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest(fakeAssociatedSfSubsResponse)).getActiveSubs(Seq[String]("123")) shouldBe Right(fakeAssociatedSfSubs)
  }

  "getActiveSubs" should "return SoftOptInError on an unsuccessful request" in {
    val result = new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest("")).getActiveSubs(Seq[String]("123"))

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "updateSubsInSf" should "return None when subs successfully updated in SF" in {
    new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest(fakeSfSubsSuccessfulUpdateResponse)).updateSubsInSf("") shouldBe Right(())
  }

  "updateSubsInSf" should "return SoftOptInError when decoding sf response fails" in {
    val result = new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest("", forceThrow = true)).updateSubsInSf("")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "updateSubsInSf" should "return Unit if the update request to Salesforce fails" in {
    new SalesforceConnector(fakeAuthDetails, "v46.0", getRunRequest(fakeSfSubsFailedUpdateResponse)).updateSubsInSf("") shouldBe Right(())
  }

}
