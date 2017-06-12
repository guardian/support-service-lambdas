package com.gu.paymentFailure

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.APIGatewayResponse.{ outputForAPIGateway, _ }
import com.gu.autoCancel.Auth._
import java.io._
import com.gu.autoCancel.Config.setConfig
import com.gu.autoCancel.ZuoraModels._
import com.gu.autoCancel.{ Logging, ZuoraRestService, ZuoraService }
import play.api.libs.json.{ JsError, JsSuccess, Json }
import scala.util.{ Failure, Success }
import scalaz.{ -\/, \/, \/- }

trait PaymentFailureLambda extends Logging {
  def config: Config
  def zuoraService: ZuoraService
  def queueClient: QueueClient

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
            enqueueEmail(callout.value) match {
              case -\/(error) => outputForAPIGateway(outputStream, internalServerError(error))
              case \/-(_) => outputForAPIGateway(outputStream, successfulCancellation)
            }
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

  def enqueueEmail(paymentFailureCallout: PaymentFailureCallout): \/[String, Unit] = {
    val accountId = paymentFailureCallout.accountId
    logger.info(s"Received $paymentFailureCallout")
    val queueSendResponse = dataCollection(accountId).map { paymentInformation =>
      val message = toMessage(paymentFailureCallout, paymentInformation)
      queueClient.sendDataExtensionToQueue(message) match {
        case Success(messageResult) =>
          logger.info(s"Message queued successfully for account: $accountId")
          \/-(())
        case Failure(error) =>
          logger.error(s"Could not enqueue message for account: $accountId", error)
          -\/(s"Could not enqueue message for account $accountId")
      }
    }
    queueSendResponse.getOrElse(-\/(s"Could not retrieve additional data for account $accountId"))
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
          subscriber_id = paymentFailureInformation.subscriptionName,
          product = paymentFailureInformation.product,
          payment_method = paymentFailureCallout.paymentMethodType,
          card_type = paymentFailureCallout.creditCardType,
          card_expiry_date = paymentFailureCallout.creditCardExpirationMonth + "/" + paymentFailureCallout.creditCardExpirationYear,
          first_name = paymentFailureCallout.firstName,
          last_name = paymentFailureCallout.lastName,
          paymentId = paymentFailureCallout.paymentId,
          price = price(paymentFailureInformation.amount, paymentFailureCallout.currency)
        )
      )
    )
  )

  def price(amount: Double, currency: String): String = {
    s"${amount.toString} $currency" //todo pretty price function
  }

  //todo see if we need to parse the payment number as an int
  def dataExtensionNameForAttempt: Map[String, String] = Map("1" -> "first-failed-payment-email", "2" -> "second-failed-payment-email", "3" -> "third-failed-payment-email")

  case class PaymentFailureInformation(subscriptionName: String, product: String, amount: Double)

  //todo for now just return an option here but the error handling has to be refactored a little bit
  def dataCollection(accountId: String): Option[PaymentFailureInformation] = {
    logger.info(s"Attempting to get further details from account $accountId")
    val unpaidInvoices = zuoraService.getInvoiceTransactions(accountId).map {
      invoiceTransactionSummary =>
        invoiceTransactionSummary.invoices.filter {
          invoice => unpaid(invoice)
        }
    }
    unpaidInvoices.toOption.flatMap { unpaid =>
      unpaid.headOption match {
        case Some(invoice) => {
          logger.info(s"Found the following unpaid invoice: $invoice")
          val positiveInvoiceItems = invoice.invoiceItems.filter(item => invoiceItemFilter(item))
          positiveInvoiceItems.headOption.map {
            item =>
              {
                val paymentFailureInfo = PaymentFailureInformation(item.subscriptionName, item.productName, invoice.amount)
                logger.info(s"Payment failure information for account: $accountId is: $paymentFailureInfo")
                paymentFailureInfo
              }
          }
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

  def invoiceItemFilter(item: InvoiceItem): Boolean = {
    item.chargeAmount > 0 // remove discounts, holiday credits and free products
  }

}

object Lambda extends PaymentFailureLambda {
  override val config = EnvConfig
  override val zuoraService = new ZuoraRestService(setConfig)
  override val queueClient = SqsClient
}

