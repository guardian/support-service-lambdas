package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SFSubRecordResponse, SoftOptInError}
import com.gu.soft_opt_in_consent_setter.testData.SalesforceTestData.{
  authDetails,
  failedResponse,
  subsToProcess,
  successfulAuthResponse,
  successfulCompositeUpdateResponse,
  successfulQueryResponse,
  thrownResponse,
}
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import io.circe.generic.auto._

class SalesforceConnectorTests extends AnyFlatSpec with should.Matchers with EitherValues {

  val sfConnector = new SalesforceConnector(authDetails, sfApiVersion = "v46.0")

  // auth success cases
  "auth" should "returns authentication details on a successful request" in {
    SalesforceConnector.handleAuthResp(successfulAuthResponse) shouldBe Right(authDetails)
  }

  // auth failure cases
  "auth" should "returns a SoftOptInError on an unsuccessful request" in {
    val result = SalesforceConnector.handleAuthResp(thrownResponse)

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.getMessage shouldBe "SalesforceConnector: Salesforce authentication failed: java.lang.Throwable"
  }

  "auth" should "returns a SoftOptInError if an unexpected body is found" in {
    val result = SalesforceConnector.handleAuthResp(failedResponse)

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.getMessage shouldBe "SalesforceConnector: Could not decode SfAuthDetails: io.circe.ParsingFailure: expected json value got 'unexpe...' (line 1, column 1). String to decode: unexpected body"
  }

  // handleQueryResp success cases
  "handleQueryResp" should "return the body on a successful request" in {
    sfConnector.handleQueryResp[SFSubRecordResponse](successfulQueryResponse) shouldBe Right(subsToProcess)
  }

  // handleQueryResp failure cases
  "handleQueryResp" should "return a SoftOptInError on an unsuccessful request" in {
    val result = sfConnector.handleQueryResp[SFSubRecordResponse](thrownResponse)

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.getMessage shouldBe "SalesforceConnector: Salesforce query request failed: java.lang.Throwable"
  }

  "handleQueryResp" should "return a SoftOptInError if an unexpected body is found" in {
    val result = sfConnector.handleQueryResp[SFSubRecordResponse](failedResponse)

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.getMessage shouldBe "SalesforceConnector: Decode error:io.circe.ParsingFailure: expected json value got 'unexpe...' (line 1, column 1). String to decode unexpected body"
  }

  // handleCompositeUpdateResp success cases
  "handleCompositeUpdateResp" should "return the body on a successful request" in {
    sfConnector.handleCompositeUpdateResp(successfulCompositeUpdateResponse, (_, _) => ()) shouldBe Right(())
  }

  // handleCompositeUpdateResp failure cases
  "handleCompositeUpdateResp" should "return a SoftOptInError on an unsuccessful request" in {
    val result = sfConnector.handleCompositeUpdateResp(thrownResponse, (_, _) => ())

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.getMessage shouldBe "SalesforceConnector: Salesforce composite request failed: java.lang.Throwable"
  }

  "handleCompositeUpdateResp" should "return a SoftOptInError if an unexpected body is found" in {
    val result = sfConnector.handleCompositeUpdateResp(failedResponse, (_, _) => ())

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.getMessage shouldBe "SalesforceConnector: Could not decode SfCompositeRequest.Response: io.circe.ParsingFailure: expected json value got 'unexpe...' (line 1, column 1). String to decode: unexpected body"
  }

}
