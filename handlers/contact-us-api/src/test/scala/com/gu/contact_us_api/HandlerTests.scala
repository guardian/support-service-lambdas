package com.gu.contact_us_api

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent
import com.gu.contact_us_api.models.{ContactUsError, ContactUsResponse, SFCompositeRequest}
import io.circe.generic.auto._
import io.circe.syntax._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class HandlerTests extends AnyFlatSpec with should.Matchers {

  val handler = new Handler()

  val validJson: String =
    """
      {
        "topic": "billing",
        "subtopic": "s2",
        "subsubtopic": "ss4",
        "name": "Manuel Joaquim",
        "email": "manuel.joaquim@email.com",
        "subject": "Extra charges",
        "message": "EXTRA CHARGES OMGWTFBBQ!!1",
        "attachment": {
          "name": "printscreen.jpeg",
          "contents": "loadsofcharacters"
        }
      }
    """

  val invalidJson = """{ "isThisValid": "no" }"""

  val successfulHandleResponse = new APIGatewayProxyResponseEvent()
    .withStatusCode(201)
    .withBody(
      ContactUsResponse(success = true)
        .asJson
        .dropNullValues
        .toString
    )

  val inputFailureHandleResponse = new APIGatewayProxyResponseEvent()
    .withStatusCode(400)
    .withBody(
      ContactUsResponse(success = false, Some("Invalid input"))
        .asJson
        .dropNullValues
        .toString
    )

  val internalFailureHandleResponse = new APIGatewayProxyResponseEvent()
    .withStatusCode(500)
    .withBody(
      ContactUsResponse(success = false, Some("Internal server error"))
        .asJson
        .dropNullValues
        .toString
    )

  def successfulHandle(req: SFCompositeRequest): Either[ContactUsError, Unit] = {
    Right(())
  }

  def inputFailureHandle(req: SFCompositeRequest): Either[ContactUsError, Unit] = {
    Left(ContactUsError("Input", "Things went wrong"))
  }

  def internalErrorHandle(req: SFCompositeRequest): Either[ContactUsError, Unit] = {
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
