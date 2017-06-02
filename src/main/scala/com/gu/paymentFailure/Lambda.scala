package com.gu.paymentFailure

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.APIGatewayResponse.{outputForAPIGateway, _}
import com.gu.autoCancel.Auth._
import java.io._
import java.lang.System._

import com.gu.autoCancel.Logging
import play.api.libs.json.{JsError, JsSuccess, JsValue, Json}

object Lambda extends App with Logging {

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    logger.info(s"Payment Failure Lambda is starting up...")
    val inputEvent = Json.parse(inputStream)
    logger.info(s"Received input event as JsValue: \n $inputEvent")
    if (credentialsAreValid(inputEvent, getenv("ApiClientId"), getenv("ApiToken"))) {
      logger.info("Authenticated request successfully...")

      val maybeBody = inputEvent \ "body"
      maybeBody.toOption.map { body =>
        Json.fromJson[PaymentFailureCallout](Json.parse(body.as[String])) match {
          case callout: JsSuccess[PaymentFailureCallout] =>
            logger.info(s"it worked: $callout")
            outputForAPIGateway(outputStream, successfulCancellation)
          case e: JsError =>
            logger.error(s"error parsing callout body: $e")
            outputForAPIGateway(outputStream, badRequest)
        }

      }.getOrElse(
        outputForAPIGateway(outputStream, badRequest)
      )

    } else {
      logger.info("Request from Zuora could not be authenticated")
      outputForAPIGateway(outputStream, unauthorized)
    }
  }
}

