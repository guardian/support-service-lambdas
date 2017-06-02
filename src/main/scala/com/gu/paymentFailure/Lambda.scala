package com.gu.paymentFailure

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.APIGatewayResponse.{ outputForAPIGateway, _ }
import com.gu.autoCancel.Auth._
import java.io._
import java.lang.System._

import com.gu.autoCancel.Logging
import play.api.libs.json.{ JsValue, Json }

object Lambda extends App with Logging {

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    logger.info(s"Payment Failure Lambda is starting up...")
    val inputEvent = Json.parse(inputStream)
    logger.info(s"Received input event as JsValue: \n $inputEvent")
    if (credentialsAreValid(inputEvent, getenv("ApiClientId"), getenv("ApiToken"))) {
      logger.info("Authenticated request successfully...")

      val maybeBody = inputEvent \ "body"
      maybeBody.toOption.map { body =>
        val callout = Json.fromJson[PaymentFailureCallout](body)
        logger.info(s"it worked: $callout")
        outputForAPIGateway(outputStream, successfulCancellation)
      }.getOrElse(
        outputForAPIGateway(outputStream, badRequest)
      )

    } else {
      logger.info("Request from Zuora could not be authenticated")
      outputForAPIGateway(outputStream, unauthorized)
    }
  }
}

