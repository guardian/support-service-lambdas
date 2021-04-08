package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{IdentityConfig, SoftOptInError}
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import scalaj.http.{HttpRequest, HttpResponse}

class IdentityConnectorTests extends AnyFlatSpec with should.Matchers with EitherValues {

  def getRunRequest(forceThrow: Boolean = false, statusCode: Int = 200): HttpRequest => Either[Throwable, HttpResponse[String]] = {
    def mockedRunRequest(http: HttpRequest): Either[Throwable, HttpResponse[String]] = {
      if (forceThrow)
        Left(new Throwable())
      else
        Right(HttpResponse("", statusCode, Map.empty[String, IndexedSeq[String]]))
    }

    mockedRunRequest
  }

  val fakeConfig = IdentityConfig("url", "token")

  // sendConsentsReq success cases
  "sendConsentsReq" should "return Unit if the the request was successful and the reply is 2xx" in {
    new IdentityConnector(fakeConfig, getRunRequest()).sendConsentsReq("identityID", "body") shouldBe Right(())
  }

  // sendConsentsReq failure cases
  "sendConsentsReq" should "return a SoftOptInError if the the request was unsuccessful" in {
    val result = new IdentityConnector(fakeConfig, getRunRequest(forceThrow = true)).sendConsentsReq("identityID", "body")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "IdentityConnector"
  }

  "sendConsentsReq" should "return a SoftOptInError if the the request was successful but a failure code was received" in {
    val result = new IdentityConnector(fakeConfig, getRunRequest(statusCode = 400)).sendConsentsReq("identityID", "body")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "IdentityConnector"
  }
}
