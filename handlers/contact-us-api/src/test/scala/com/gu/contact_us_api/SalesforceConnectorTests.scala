package com.gu.contact_us_api

import com.gu.contact_us_api.models.ContactUsTestVars.{testEmail, testMessage, testName, testSubject, testTopic}
import com.gu.contact_us_api.models.{ContactUsConfig, ContactUsError, SFCaseRequest, SFCompositeRequest, SFErrorDetails}
import com.gu.contact_us_api.services.{MembersDataAPISecrets, SalesforceSecrets}
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import scalaj.http.{HttpRequest, HttpResponse}

class SalesforceConnectorTests extends AnyFlatSpec with should.Matchers with EitherValues {

  def getRunRequest(
      body: String,
      statusCode: Int = 200,
  ): HttpRequest => Either[ContactUsError, HttpResponse[String]] = {
    def mockedRunRequest(http: HttpRequest): Either[ContactUsError, HttpResponse[String]] = {
      Right(HttpResponse(body, statusCode, Map.empty[String, IndexedSeq[String]]))
    }

    mockedRunRequest
  }

  private val fakeConfg = ContactUsConfig("authEndpoint", "reqEndpoint")
  private val fakeSalesforceSecrets = SalesforceSecrets("clientId", "clientSecret")
  private val fakeMembersDataAPISecrets = MembersDataAPISecrets("username", "password", "token")

  private val fakeRequest = SFCompositeRequest(
    List(SFCaseRequest(testTopic, None, None, testName, testEmail, testSubject, testMessage)),
  )
  private val invalidJson = "{}"

  private val authToken = "THIS_IS_A_TOKEN"
  private val successfulAuthRequestJson = s"""{ "access_token": "$authToken" }"""

  private val failedAuthStatusCode = 400
  private val failedAuthError = "invalid_grant"
  private val failedAuthErrorDescription = "authentication failure"
  private val failedAuthReqJson =
    s"""{ "error": "$failedAuthError", "error_description": "$failedAuthErrorDescription" }"""

  private val compositeReferenceId = "newCase"
  private val compositeErrorCode = "ERROR"
  private val compositeErrorMessage = "request failure"

  private val successfulCompositeReqJson =
    s"""{ "compositeResponse": [{ "httpStatusCode": 201, "referenceId": "$compositeReferenceId" }] }"""

  private val compositeErrorStatusCode = 400
  private val successfulCompositeReqWithErrorJson =
    s"""{ "compositeResponse": [{ "httpStatusCode": $compositeErrorStatusCode, "referenceId": "$compositeReferenceId", "body": [{ "errorCode": "$compositeErrorCode", "message": "$compositeErrorMessage" }] }] }"""

  private val failedCompositeStatusCode = 500
  private val failedCompositeReqJson =
    s"""[{ "errorCode": "$compositeErrorCode", "message": "$compositeErrorMessage" }]"""

  it should "return a ContactUsError when the request fails" in {
    new SalesforceConnector(getRunRequest(failedAuthReqJson, failedAuthStatusCode))
      .auth(fakeConfg, fakeSalesforceSecrets, fakeMembersDataAPISecrets) shouldBe
      Left(
        ContactUsError(
          "Salesforce",
          s"Could not authenticate: Status code: $failedAuthStatusCode. $failedAuthError - $failedAuthErrorDescription",
        ),
      )
  }

  it should "return a ContactUsError of type Decoder when it receives as unexpected response body in a 2xx response" in {
    val result2xx = new SalesforceConnector(getRunRequest(invalidJson))
      .auth(fakeConfg, fakeSalesforceSecrets, fakeMembersDataAPISecrets)

    result2xx.isLeft shouldBe true
    result2xx.left.value shouldBe a[ContactUsError]
    result2xx.left.value.errorType shouldBe "Decode"
  }

  it should "return a ContactUsError of type Decoder when it receives as unexpected response body in a non-2xx response" in {
    val result500 = new SalesforceConnector(getRunRequest(invalidJson, 500))
      .auth(fakeConfg, fakeSalesforceSecrets, fakeMembersDataAPISecrets)

    result500.isLeft shouldBe true
    result500.left.value shouldBe a[ContactUsError]
    result500.left.value.errorType shouldBe "Decode"
  }

  "sendReq" should "return Right() when the request is successful " in {
    new SalesforceConnector(getRunRequest(successfulCompositeReqJson))
      .sendReq(fakeConfg, authToken, fakeRequest) shouldBe Right(())
  }

  it should "return ContactUsError when the request is successful but reports an error" in {
    new SalesforceConnector(getRunRequest(successfulCompositeReqWithErrorJson))
      .sendReq(fakeConfg, authToken, fakeRequest) shouldBe
      Left(
        ContactUsError(
          "Salesforce",
          s"Could not complete composite request. Status code: 200. Status code for $compositeReferenceId: $compositeErrorStatusCode ${SFErrorDetails(compositeErrorCode, compositeErrorMessage).asString}",
        ),
      )
  }

  it should "return a ContactUsError when the request fails" in {
    new SalesforceConnector(getRunRequest(failedCompositeReqJson, failedCompositeStatusCode))
      .sendReq(fakeConfg, authToken, fakeRequest) shouldBe
      Left(
        ContactUsError(
          "Salesforce",
          s"Could not complete request. Status code: $failedCompositeStatusCode. $compositeErrorCode - $compositeErrorMessage",
        ),
      )
  }

  it should "return a ContactUsError of type Decoder when it receives as unexpected response body in a 2xx response" in {
    val result2xx = new SalesforceConnector(getRunRequest(invalidJson))
      .sendReq(fakeConfg, authToken, fakeRequest)

    result2xx.isLeft shouldBe true
    result2xx.left.value shouldBe a[ContactUsError]
    result2xx.left.value.errorType shouldBe "Decode"
  }

  it should "return a ContactUsError of type Decoder when it receives as unexpected response body in a non-2xx response" in {
    val result500 = new SalesforceConnector(getRunRequest(invalidJson, 500))
      .sendReq(fakeConfg, authToken, fakeRequest)

    result500.isLeft shouldBe true
    result500.left.value shouldBe a[ContactUsError]
    result500.left.value.errorType shouldBe "Decode"
  }

}
