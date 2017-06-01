package com.gu.paymentFailure

import com.amazonaws.services.lambda.runtime.Context
import com.github.nscala_time.time.OrderingImplicits._
import com.gu.autoCancel.APIGatewayResponse._
import com.gu.autoCancel.Auth._
import com.gu.autoCancel.Config._
import com.gu.autoCancel.ZuoraModels._
import org.joda.time.LocalDate
import java.io._
import java.lang.System._

import com.gu.autoCancel.Logging
import com.gu.autoCancel.ResponseModels.AutoCancelResponse
import play.api.libs.json.{ JsValue, Json }

import scala.xml.Elem
import scala.xml.XML._
import scalaz.Scalaz._
import scalaz.{ -\/, \/, \/- }

object Lambda extends App with Logging {

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    logger.info(s"Payment Failure Lambda is starting up...")
    val inputEvent = Json.parse(inputStream)
    logger.info(s"Received input event as JsValue: \n $inputEvent")
    if (credentialsAreValid(inputEvent, getenv("ApiClientId"), getenv("ApiToken"))) {
      logger.info("Authenticated request successfully...")
      logger.info("it worked")
      outputForAPIGateway(outputStream, successfulCancellation)
    } else {
      logger.info("Request from Zuora could not be authenticated")
      outputForAPIGateway(outputStream, unauthorized)
    }
  }
}