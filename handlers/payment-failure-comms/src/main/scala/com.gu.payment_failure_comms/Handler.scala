package com.gu.payment_failure_comms

import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent}
import com.gu.payment_failure_comms.models.{Config, CustomEvent, Failure}
import com.gu.util.Logging
import io.circe.generic.auto._
import io.circe.syntax._

class Handler extends RequestHandler[APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent] with Logging {

  def handleRequest(event: APIGatewayProxyRequestEvent, context: Context): APIGatewayProxyResponseEvent = {

    logger.info("Received request with body: " + event.getBody)

    (for {
      config <- Config()
      customEvent <- convertToCustomEventRequest(event.getBody)
      _ = BrazeConnector.sendCustomEvent(config.braze, customEvent.asJson.toString)
    } yield ()) match {
      case Right(_) => new APIGatewayProxyResponseEvent().withStatusCode(200)
      case Left(failure) => {
        logger.error(s"An error happened. ${failure.kind}: ${failure.details}")

        new APIGatewayProxyResponseEvent().withStatusCode(500)
      }
    }

  }

  def convertToCustomEventRequest(body: String): Either[Failure, CustomEvent] = ???

}
