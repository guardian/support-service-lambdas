package com.gu.payment_failure_comms

import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.lambda.runtime.events.{APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent}
import com.gu.payment_failure_comms.models.{BrazeTrackRequest, Config, CustomEvent, Failure, PaymentFailureCommsRequest, RequestFailure}
import com.gu.util.Logging
import io.circe.generic.auto._
import io.circe.parser.decode
import io.circe.syntax._

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

class Handler extends RequestHandler[APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent] with Logging {

  def handleRequest(event: APIGatewayProxyRequestEvent, context: Context): APIGatewayProxyResponseEvent = {

    logger.info("Received request with body: " + event.getBody)

    (for {
      config <- Config()
      request <- decodeMessage(event.getBody)
      brazeRequest = convertToEventsRequest(
        request = request,
        brazeId = "1bd449f3-4326-4ae5-89dd-35cce2d50944",
        zuoraAppId = config.braze.zuoraAppId)
      _ <- BrazeConnector.sendCustomEvent(config.braze, brazeRequest.asJson.toString)
    } yield ()) match {
      case Right(_) =>
        logger.info(s"The request was successful.")
        new APIGatewayProxyResponseEvent().withStatusCode(200)
      case Left(failure) =>
        logger.error(s"An error occurred. ${failure.kind}: ${failure.details}")
        new APIGatewayProxyResponseEvent().withStatusCode(500)
    }

  }

  def decodeMessage(body: String): Either[Failure, PaymentFailureCommsRequest] = {
    decode[PaymentFailureCommsRequest](body)
      .left.map(error => RequestFailure(s"Failed to decode: $error"))
      .flatMap(request =>
        request.event match {
          case "payment_failure" | "payment_recovery" => Right(request)
          case _ => Left(RequestFailure(s"Invalid event."))
        }
      )
  }

  def convertToEventsRequest(request: PaymentFailureCommsRequest, brazeId: String, zuoraAppId: String): BrazeTrackRequest = {
    BrazeTrackRequest(
      List(
        CustomEvent(
          external_id = brazeId,
          app_id = zuoraAppId,
          name = request.event,
          time = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss:SSSZ").format(ZonedDateTime.now),
          properties = request.properties
        )
      )
    )
  }

}
