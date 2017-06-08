package com.gu.paymentFailure

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.APIGatewayResponse.{ outputForAPIGateway, _ }
import com.gu.autoCancel.Auth._
import java.io._
import java.lang.System._
import java.text.SimpleDateFormat
import com.gu.autoCancel.Config.setConfig
import com.gu.autoCancel.ResponseModels.AutoCancelResponse
import com.gu.autoCancel.ZuoraModels._
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
    if (credentialsAreValid(inputEvent, config.apiClientId, config.apiToken)) {
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
    val accountId = paymentFailureCallout.accountId
    logger.info(s"Received $paymentFailureCallout")
    dataCollection(accountId).map { paymentInformation =>
      val message = toMessage(paymentFailureCallout, paymentInformation)
      queueClient.sendDataExtensionToQueue(message) match {
        case Success(messageResult) => logger.info(s"Message queued successfully for account: $accountId")
        case Failure(error) => logger.error(s"Could not enqueue message for account: $accountId", error)
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
          subscriber_id = paymentFailureInformation.subscriptionName,
          product = paymentFailureInformation.product,
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

  case class PaymentFailureInformation(subscriptionName: String, product: String)

  //todo for now just return an option here but the error handling has to be refactored a little bit
  def dataCollection(accountId: String): Option[PaymentFailureInformation] = {
    logger.info("attempting to get further details from account")
    val unpaidInvoices = zuoraService.getInvoiceTransactions(accountId).map {
      invoiceTransactionSummary =>
        invoiceTransactionSummary.invoices.filter {
          invoice => unpaid(invoice)
        }
    }
    unpaidInvoices.toOption.flatMap {
      unpaid =>
        unpaid.headOption match {
          case Some(invoice) => {
            logger.info(s"Found the following unpaid invoice: $invoice")
            invoice.invoiceItems.headOption.map { item =>
              val paymentFailureInfo = PaymentFailureInformation(item.subscriptionName, item.productName)
              logger.info(s"Payment failure information for account: $accountId is: $paymentFailureInfo")
              paymentFailureInfo
            } //todo make this safe
          }
          case None => {
            logger.error(s"No unpaid invoice found - nothing to do")
            None
          }
        }
    }
  }

  def unpaid(itemisedInvoice: ItemisedInvoice): Boolean = {
    itemisedInvoice.balance > 0 && itemisedInvoice.status == "Posted"
  }

}

object Lambda extends PaymentFailureLambda {
  override val config = EnvConfig
  override val zuoraService = new ZuoraRestService(setConfig)
  override val queueClient = SqsClient
  override val currentDate = DateTime.now();
}

