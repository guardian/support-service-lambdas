package com.gu.paymentFailure

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.APIGatewayResponse.{ outputForAPIGateway, _ }
import com.gu.autoCancel.Auth._
import java.io._
import java.lang.System._
import com.gu.autoCancel.Config.setConfig
import com.gu.autoCancel.{ Logging, ZuoraRestService }
import play.api.libs.json.{ JsError, JsSuccess, Json }

object Lambda extends App with Logging {

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    logger.info(s"Payment Failure Lambda is starting up...")
    val inputEvent = Json.parse(inputStream)
    logger.info(s"Received input event as JsValue: \n $inputEvent")
    if (credentialsAreValid(inputEvent, getenv("ApiClientId"), getenv("ApiToken"))) {
      logger.info("Authenticated request successfully...")
      val maybeBody = (inputEvent \ "body").toOption
      maybeBody.map { body =>
        Json.fromJson[PaymentFailureCallout](Json.parse(body.as[String])) match {
          case callout: JsSuccess[PaymentFailureCallout] =>
            dataCollection(callout.value, outputStream)
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

  def dataCollection(paymentFailureCallout: PaymentFailureCallout, outputStream: OutputStream): Unit = {
    logger.info(s"Received $paymentFailureCallout, attempting to get further details from account")
    val restService = new ZuoraRestService(setConfig)
    restService.getAccountSummary(paymentFailureCallout.accountId).map {
      accountSummary =>
        {
          logger.info(s"Got: $accountSummary")
          val activeSubsForAccount = accountSummary.subscriptions.filter(_.status == "Active")
          if (activeSubsForAccount.size != 1) {
            logger.error("Unable to precisely identify unpaid subscription")
          } else {
            val subName = accountSummary.subscriptions.head.name
            logger.info(s"Subscription name for email is: $subName")
          }
        }
    }
    outputForAPIGateway(outputStream, successfulCancellation)
  }

  //  import org.apache.commons.io.output.NullOutputStream
  //  val testPaymentFailureCallout = PaymentFailureCallout(
  //    accountId = "id123",
  //    email = "test.user123@guardian.co.uk",
  //    failureNumber = "1",
  //    firstName = "Test",
  //    lastName = "User",
  //    paymentMethodType = "CreditCard",
  //    creditCardType = "Visa",
  //    creditCardExpirationMonth = "12",
  //    creditCardExpirationYear = "2017"
  //  )
  //  val nullOutputStream = new NullOutputStream
  //  dataCollection(testPaymentFailureCallout, nullOutputStream)

}

