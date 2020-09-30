package com.gu.contact_us_api

import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent}
import com.gu.contact_us_api.models.ContactUsResponse
import com.gu.util.Logging
import io.circe.generic.auto._
import io.circe.syntax._

class Handler extends RequestHandler[APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent] with Logging {

  val contactUsReqHandler = new ContactUs(new SalesforceConnector())

  def handleRequest(event: APIGatewayProxyRequestEvent, context: Context): APIGatewayProxyResponseEvent = {
    logger.info("Received request with body: " + event.getBody)

    val response = process(event.getBody)

    logger.info("Responding with: " + response)

    response
  }

  def process(reqBody: String): APIGatewayProxyResponseEvent = {
    contactUsReqHandler.processReq(reqBody) match {
      case Right(_) =>
        new APIGatewayProxyResponseEvent()
          .withStatusCode(201)
          .withBody(
            ContactUsResponse(success = true)
              .asJson
              .dropNullValues
              .toString
          )

      case Left(fail) =>
        logger.error(fail.errorDetails)

        val statusCode = if (fail.errorType == "Input") 400 else 500
        val message = if (fail.errorType == "Input") "Invalid input" else "Internal server error"

        new APIGatewayProxyResponseEvent()
          .withStatusCode(statusCode)
          .withBody(
            ContactUsResponse(success = false, Some(message))
              .asJson
              .toString
          )
    }
  }

}
