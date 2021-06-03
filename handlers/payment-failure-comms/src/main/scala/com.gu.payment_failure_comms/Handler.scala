package com.gu.payment_failure_comms

import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent}
import com.gu.util.Logging

class Handler extends RequestHandler[APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent] with Logging {

  def handleRequest(event: APIGatewayProxyRequestEvent, context: Context): APIGatewayProxyResponseEvent = {
    logger.info("Received request with body: " + event.getBody)

    new APIGatewayProxyResponseEvent().withStatusCode(200)
  }
}