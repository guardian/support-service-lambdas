package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SalesforceConfig, SfAuthDetails, SoftOptInError}
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import scalaj.http.{HttpRequest, HttpResponse}
import io.circe.generic.auto._
import io.circe.syntax.EncoderOps

class SalesforceConnectorTests extends AnyFlatSpec with should.Matchers with EitherValues {

  def getRunRequest(body: String, forceThrow: Boolean = false, statusCode: Int = 200): HttpRequest => Either[Throwable, HttpResponse[String]] = {
    def mockedRunRequest(http: HttpRequest): Either[Throwable, HttpResponse[String]] = {
      if (forceThrow)
        Left(new Throwable())
      else
        Right(HttpResponse(body, statusCode, Map.empty[String, IndexedSeq[String]]))
    }

    mockedRunRequest
  }

  val fakeConfig = SalesforceConfig("url", "id", "secret", "username", "password", "token")

  val fakeAccessToken = "access_token"
  val fakeInstanceUrl = "url.com"
  val fakeAuthDetails = SfAuthDetails(fakeAccessToken, fakeInstanceUrl)
  val fakeAuthResponse =
    s"""{
       | "access_token": "$fakeAccessToken",
       | "instance_url": "$fakeInstanceUrl"
       |}""".stripMargin

  "auth" should "returns authentication details on a successful request" in {
    SalesforceConnector.auth(fakeConfig, getRunRequest(fakeAuthResponse)) shouldBe Right(fakeAuthDetails)
  }

  "auth" should "returns a SoftOptInError on an unsuccessful request" in {
    val result = SalesforceConnector.auth(fakeConfig, getRunRequest(fakeAuthResponse, forceThrow = true))

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "auth" should "returns a SoftOptInError if the body is unrecognised" in {
    val result = SalesforceConnector.auth(fakeConfig, getRunRequest("broken body"))

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "doSfGetWithQuery" should "returns the body on a successful request" in {
    new SalesforceConnector(fakeAuthDetails, getRunRequest("this body")).doSfGetWithQuery("query") shouldBe Right("this body")
  }

  "doSfGetWithQuery" should "returns a SoftOptInError on an unsuccessful request" in {
    val result = new SalesforceConnector(fakeAuthDetails, getRunRequest("this body", forceThrow = true)).doSfGetWithQuery("query")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

  "doSfCompositeRequest" should "returns the body on a successful request" in {
    new SalesforceConnector(fakeAuthDetails, getRunRequest("this body")).doSfCompositeRequest("body", "PATCH") shouldBe Right("this body")
  }

  "doSfCompositeRequest" should "returns a SoftOptInError on an unsuccessful request" in {
    val result = new SalesforceConnector(fakeAuthDetails, getRunRequest("this body", forceThrow = true)).doSfCompositeRequest("body", "PATCH")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "SalesforceConnector"
  }

}
