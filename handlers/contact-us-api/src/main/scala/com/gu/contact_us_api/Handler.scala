package com.gu.contact_us_api

import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent}
import com.gu.contact_us_api.ParserUtils.decode
import com.gu.contact_us_api.models.{ContactUsError, ContactUsRequest, ContactUsResponse, SFCompositeRequest}
import com.gu.util.Logging
import io.circe.generic.auto._
import io.circe.syntax._

class Handler extends RequestHandler[APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent] with Logging {

  val SFConnector = new SalesforceConnector(HttpRequestUtils.runSafeRequest)

  def handleRequest(event: APIGatewayProxyRequestEvent, context: Context): APIGatewayProxyResponseEvent = {
    logger.info("Received request with body: " + event.getBody)

    val response = process(event.getBody, SFConnector.handle)

    logger.info("Responding with: " + response)

    response
  }

  def process(
      reqBody: String,
      handle: SFCompositeRequest => Either[ContactUsError, Unit],
  ): APIGatewayProxyResponseEvent = {
    val result = for {
      req <- decode[ContactUsRequest](reqBody, Some("ContactUsRequest"), "Input")
      resp <- handle(req.asSFCompositeRequest)
    } yield resp

    result match {
      case Right(_) => getResponseEvent(201, ContactUsResponse(success = true))
      case Left(fail) =>
        logger.error(fail.errorDetails)

        val (statusCode, message) =
          if (fail.errorType == "Input") (400, "Invalid input") else (500, "Internal server error")

        getResponseEvent(statusCode, ContactUsResponse(success = false, Some(message)))
    }
  }

  def getResponseEvent(statusCode: Int, payload: ContactUsResponse): APIGatewayProxyResponseEvent = {
    new APIGatewayProxyResponseEvent()
      .withStatusCode(statusCode)
      .withBody(
        payload.asJson.dropNullValues.toString,
      )
  }

}
