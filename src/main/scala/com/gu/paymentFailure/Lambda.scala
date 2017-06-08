package com.gu.paymentFailure

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.APIGatewayResponse.{ outputForAPIGateway, _ }
import com.gu.paymentFailure.Auth._
import java.io._
import java.lang.System._
import java.text.SimpleDateFormat

import com.gu.autoCancel.Config.setConfig
import com.gu.autoCancel.ResponseModels.AutoCancelResponse
import com.gu.autoCancel.ZuoraModels.{ RatePlan, RatePlanCharge, Subscription }
import com.gu.autoCancel.{ Logging, ZuoraRestService, ZuoraService }
import org.joda.time.{ DateTime, LocalDate }
import org.joda.time.format.DateTimeFormat
import play.api.libs.json.{ JsError, JsSuccess, Json }

import scala.util.{ Failure, Success }
import scalaz.Scalaz._
import scalaz.{ -\/, \/ }

trait PaymentFailureLambda extends Logging {
  def config: Config
  def zuoraService: ZuoraService
  def queueClient: QueueClient
  val dateFormatter = DateTimeFormat.forPattern("dd/MM/yyyy")
  val currentDateStr = dateFormatter.print(currentDate)
  def currentDate: DateTime

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    logger.info(s"Payment Failure Lambda is starting up...")
    val inputEvent = Json.parse(inputStream)
    logger.info(s"Received input event as JsValue: \n $inputEvent")
    if (credentialsAreValid(inputEvent, config.user, config.pass)) {
      logger.info("Authenticated request successfully...")
      val maybeBody = (inputEvent \ "body").toOption
      maybeBody.map { body =>
        Json.fromJson[PaymentFailureCallout](Json.parse(body.as[String])) match {
          case callout: JsSuccess[PaymentFailureCallout] =>
            enqueueEmail(callout.value)
            //todo see if we need error handling instead of always return success here
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

  def enqueueEmail(paymentFailureCallout: PaymentFailureCallout) = {
    logger.info(s"Received $paymentFailureCallout")
    dataCollection(paymentFailureCallout.accountId).map { paymentInformation =>
      val message = toMessage(paymentFailureCallout, paymentInformation)
      queueClient.sendDataExtensionToQueue(message) match {
        case Success(messageResult) => logger.info("message queued successfully")
        case Failure(error) => logger.error("could not enqueue message ", error)
      }
    }
  }

  def toMessage(paymentFailureCallout: PaymentFailureCallout, paymentFailureInformation: PaymentFailureInformation) = Message(
    DataExtensionName = dataExtensionNameForAttempt(paymentFailureCallout.failureNumber),
    To = ToDef(
      Address = paymentFailureCallout.email,
      SubscriberKey = paymentFailureCallout.email,
      ContactAttributes = ContactAttributesDef(
        SubscriberAttributes = SubscriberAttributesDef(
          SubscriberKey = paymentFailureCallout.email,
          EmailAddress = paymentFailureCallout.email,
          DateField = currentDateStr,
          subscriber_id = paymentFailureInformation.subscription.subscriptionNumber,
          product = paymentFailureInformation.ratePlans.map(_.productName).mkString(","), // todo just for now
          payment_method = paymentFailureCallout.paymentMethodType,
          card_type = paymentFailureCallout.creditCardType,
          card_expiry_date = paymentFailureCallout.creditCardExpirationMonth + "/" + paymentFailureCallout.creditCardExpirationYear,
          first_name = paymentFailureCallout.firstName,
          last_name = paymentFailureCallout.lastName
        )
      )
    )
  )

  //todo see if we need to parse the payment number as an int
  def dataExtensionNameForAttempt: Map[String, String] = Map("1" -> "first-failed-payment-email", "2" -> "second-failed-payment-email", "3" -> "third-failed-payment-email")

  case class PaymentFailureInformation(subscription: Subscription, ratePlans: List[RatePlan])

  //todo for now just return an option here but the error handling has to be refactored a little bit
  def dataCollection(accountId: String): Option[PaymentFailureInformation] = {
    logger.info("attempting to get further details from account")
    zuoraService.getAccountSummary(accountId).toOption.flatMap {
      accountSummary =>
        {
          logger.info(s"Got: $accountSummary")
          val activeSubsForAccount = accountSummary.subscriptions.filter(_.status == "Active")
          if (activeSubsForAccount.size != 1) {
            logger.error("Unable to precisely identify unpaid subscription")
            None
          } else {
            val subName = accountSummary.subscriptions.head.subscriptionNumber
            logger.info(s"Subscription name for email is: $subName")
            val productsForEmail = for {
              sub <- zuoraService.getSubscription(subName)
              activePlans <- currentPlansForSubscription(sub)
            } yield PaymentFailureInformation(sub, activePlans)
            logger.info(s"Products are: $productsForEmail")
            productsForEmail.toOption
          }
        }
    }
  }

  def currentPlansForSubscription(subscription: Subscription): String \/ List[RatePlan] = {
    val activePlans = subscription.ratePlans.filter { plan =>
      currentlyActive(plan)
    }
    if (activePlans.isEmpty) {
      val failureReason = s"Failed to find any active charges for ${subscription.subscriptionNumber}"
      logger.error(failureReason)
      -\/(failureReason)
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

object Lambda extends PaymentFailureLambda {
  override val config = EnvConfig
  override val zuoraService = new ZuoraRestService(setConfig)
  override val queueClient = SqsClient
  override val currentDate = DateTime.now();
}

