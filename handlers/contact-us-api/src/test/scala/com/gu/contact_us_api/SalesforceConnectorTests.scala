package com.gu.contact_us_api

import com.gu.contact_us_api.models.ContactUsTestVars.{testEmail, testMessage, testName, testSubject, testTopic}
import com.gu.contact_us_api.models.{ContactUsConfig, ContactUsError, SFCaseRequest, SFCompositeRequest}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import scalaj.http.{HttpRequest, HttpResponse}

class SalesforceConnectorTests extends AnyFlatSpec with should.Matchers {

  def getRunRequest(body: String, statusCode: Int = 200): HttpRequest => Either[ContactUsError, HttpResponse[String]] = {
    def mockedRunRequest(http: HttpRequest): Either[ContactUsError, HttpResponse[String]] = {
      Right(HttpResponse(body, statusCode, Map.empty[String, IndexedSeq[String]]))
    }

    mockedRunRequest
  }

  val fakeConfg: ContactUsConfig = ContactUsConfig("clientID", "clientSecret", "username", "password", "token", "authEndpoint", "reqEndpoint")
  val fakeRequest: SFCompositeRequest = SFCompositeRequest(List(SFCaseRequest(testTopic, None, None, testName, testEmail, testSubject, testMessage)))

  val authToken = "THIS_IS_A_TOKEN"
  val successfulAuthRequestJson = s"""{ "access_token": "$authToken" }"""

  val failedAuthStatusCode = 400
  val failedAuthError = "invalid_grant"
  val failedAuthErrorDescription = "authentication failure"
  val failedAuthReqJson = s"""{ "error": "$failedAuthError", "error_description": "$failedAuthErrorDescription" }"""

  val successfulCompositeReqJson = """{ "compositeResponse": [{ "httpStatusCode": 201, "referenceId": "newCase" }] }"""

  val failedCompositeStatusCode = 500
  val failedCompositeError = "ERROR"
  val failedCompositeErrorDescription = "request failure"
  val failedCompositeReqJson = s"""[{ "errorCode": "${failedCompositeError}", "message": "${failedCompositeErrorDescription}" }]"""

  "auth" should "return a token when the request is successful " in {
    new SalesforceConnector(getRunRequest(successfulAuthRequestJson))
      .auth(fakeConfg) shouldBe Right(authToken)
  }

  it should "return a ContactUsError when the request fails" in {
    new SalesforceConnector(getRunRequest(failedAuthReqJson, failedAuthStatusCode))
      .auth(fakeConfg) shouldBe
      Left(ContactUsError("Salesforce", s"Could not authenticate: Status code: $failedAuthStatusCode. $failedAuthError - $failedAuthErrorDescription"))
  }

  "sendReq" should "return Right() when the request is successful " in {
    new SalesforceConnector(getRunRequest(successfulCompositeReqJson))
      .sendReq(fakeConfg, authToken, fakeRequest) shouldBe Right(())
  }

  it should "return a ContactUsError when the request fails" in {
    new SalesforceConnector(getRunRequest(failedCompositeReqJson, failedCompositeStatusCode))
      .sendReq(fakeConfg, authToken, fakeRequest) shouldBe
      Left(ContactUsError("Salesforce", s"Could not complete request. Status code: $failedCompositeStatusCode. $failedCompositeError - $failedCompositeErrorDescription"))
  }

}
