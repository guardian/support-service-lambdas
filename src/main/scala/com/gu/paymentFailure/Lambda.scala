package com.gu.paymentFailure

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.APIGatewayResponse.{ outputForAPIGateway, _ }
import com.gu.autoCancel.Auth._
import java.io._
import java.lang.System._
import com.gu.autoCancel.Config.setConfig
import com.gu.autoCancel.ResponseModels.AutoCancelResponse
import com.gu.autoCancel.ZuoraModels.{ RatePlan, RatePlanCharge, Subscription }
import com.gu.autoCancel.{ Logging, ZuoraRestService }
import org.joda.time.LocalDate
import play.api.libs.json.{ JsError, JsSuccess, Json }

import scalaz.Scalaz._
import scalaz.\/

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
            val subName = accountSummary.subscriptions.head.subscriptionNumber
            logger.info(s"Subscription name for email is: $subName")
            val productsForEmail = for {
              sub <- restService.getSubscription(subName)
              activePlans <- currentPlansForSubscription(sub)
            } yield activePlans
            logger.info(s"Products are: $productsForEmail")
          }
        }
    }
    outputForAPIGateway(outputStream, successfulCancellation)
  }

  def currentPlansForSubscription(subscription: Subscription): AutoCancelResponse \/ List[RatePlan] = {
    val activePlans = subscription.ratePlans.filter { plan =>
      currentlyActive(plan)
    }
    if (activePlans.isEmpty) {
      val failureReason = s"Failed to find any active charges for ${subscription.subscriptionNumber}"
      logger.error(failureReason)
      noActionRequired(failureReason).left
    } else activePlans.right
  }

  def currentlyActive(ratePlan: RatePlan): Boolean = {
    val today = LocalDate.now()
    def datesInRange(ratePlanCharge: RatePlanCharge): Boolean = {
      val startDate = ratePlanCharge.effectiveStartDate
      (startDate.equals(today) || startDate.isBefore(today)) && ratePlanCharge.effectiveEndDate.isAfter(today)
    }
    val activeCharges = ratePlan.ratePlanCharges.filter {
      ratePlanCharge => datesInRange(ratePlanCharge)
    }
    activeCharges.nonEmpty
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

