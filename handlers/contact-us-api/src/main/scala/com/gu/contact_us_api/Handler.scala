package com.gu.contact_us_api

import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent}
import com.gu.util.Logging
import io.circe.syntax._

class Handler extends RequestHandler[APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent] with Logging {
  val contactUsReqHandler = new ContactUs(new SalesforceConnector())

  def handleRequest(event: APIGatewayProxyRequestEvent, context: Context): APIGatewayProxyResponseEvent = {
    logger.info("Received request with body " + event.getBody)

    val response = process(event.getBody)

    logger.info("Responding with " + response)

    response
  }

  def process(reqBody: String): APIGatewayProxyResponseEvent  = {
    contactUsReqHandler.processReq(reqBody) match {
      case Right(succ) =>
        new APIGatewayProxyResponseEvent()
          .withStatusCode(201)
          .withBody(succ.asJson.toString())

      case Left(fail)=>
        new APIGatewayProxyResponseEvent()
          .withStatusCode(500)
          .withBody(fail.asJson.toString())

    }
  }
}
