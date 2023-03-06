package com.gu.contact_us_api

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent
import com.gu.contact_us_api.models.ContactUsTestVars._
import com.gu.contact_us_api.models.{ContactUsError, ContactUsResponse, SFCaseRequest, SFCompositeRequest}
import io.circe.generic.auto._
import io.circe.syntax._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class HandlerTests extends AnyFlatSpec with should.Matchers {

  private val handler = new Handler()

  private val validJson: String =
    s"""
      {
        "topic": "$testTopic",
        "subtopic": "$testSubtopic",
        "subsubtopic": "$testSubsubtopic",
        "name": "$testName",
        "email": "$testEmail",
        "subject": "$testSubject",
        "message": "$testMessage",
        "attachment": {
          "name": "$testFileName",
          "contents": "$testFileContents"
        }
      }
    """

  private val invalidJson = """{ "isThisValid": "no" }"""

  private val successfulHandleResponse = new APIGatewayProxyResponseEvent()
    .withStatusCode(201)
    .withBody(
      ContactUsResponse(success = true).asJson.dropNullValues.toString,
    )

  private val inputFailureHandleResponse = new APIGatewayProxyResponseEvent()
    .withStatusCode(400)
    .withBody(
      ContactUsResponse(success = false, Some("Invalid input")).asJson.dropNullValues.toString,
    )

  private val internalFailureHandleResponse = new APIGatewayProxyResponseEvent()
    .withStatusCode(500)
    .withBody(
      ContactUsResponse(success = false, Some("Internal server error")).asJson.dropNullValues.toString,
    )

  private def successfulHandle(req: SFCompositeRequest): Either[ContactUsError, Unit] = {
    Right(())
  }

  private def inputFailureHandle(req: SFCompositeRequest): Either[ContactUsError, Unit] = {
    Left(ContactUsError("Input", "Things went wrong"))
  }

  private def internalErrorHandle(req: SFCompositeRequest): Either[ContactUsError, Unit] = {
    Left(ContactUsError("Salesforce", "Things went wrong"))
  }

  "process" should "return a 201 response with correct body when handle returns Right()" in {
    handler.process(validJson, successfulHandle) shouldBe successfulHandleResponse
  }

  it should "return a 400 response with correct body when the body is invalid" in {
    handler.process(invalidJson, successfulHandle) shouldBe inputFailureHandleResponse
  }

  it should "return a 400 response with correct body when handle returns Left() and errorType equals Input " in {
    handler.process(validJson, inputFailureHandle) shouldBe inputFailureHandleResponse
  }

  it should "return a 500 response with correct body when handle returns Left() and errorType does not equal Input" in {
    handler.process(validJson, internalErrorHandle) shouldBe internalFailureHandleResponse
  }
}
