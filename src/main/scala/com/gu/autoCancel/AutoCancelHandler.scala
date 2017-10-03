package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.Context
import com.github.nscala_time.time.OrderingImplicits._
import com.gu.util.ApiGatewayResponse._
import com.gu.util.Auth._
import com.gu.util.{ Config, Logging, ZuoraRestConfig, ZuoraRestService }
import com.gu.util.ResponseModels.ApiResponse
import com.gu.util.ZuoraModels._
import java.io._
import org.joda.time.LocalDate
import play.api.libs.json.{ JsValue, Json }
import scala.util.{ Failure, Success }
import scala.xml.Elem
import scala.xml.XML._
import scalaz.Scalaz._
import scalaz.{ -\/, \/, \/- }

object AutoCancelHandler extends App with Logging {

  /* Entry point for our Lambda - this takes the input event from API Gateway,
  extracts out the XML body and then hands over to cancellationAttemptForPayload for the 'real work'.
  */
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val stage = System.getenv("Stage")
    logger.info(s"Auto-cancel Lambda is starting up in $stage")
    val configAttempt = Config.load(stage)
    configAttempt match {
      case Success(config) => {
        val inputEvent = Json.parse(inputStream)
        if (credentialsAreValid(inputEvent, config.trustedApiConfig)) {
          logger.info("Authenticated request successfully...")
          val xmlBody = extractXmlBodyFromJson(inputEvent)
          cancellationAttemptForPayload(config.zuoraRestConfig, xmlBody, outputStream)
        } else {
          logger.info("Request from Zuora could not be authenticated")
          outputForAPIGateway(outputStream, unauthorized)
        }
      }
      case Failure(_) => {
        outputForAPIGateway(outputStream, internalServerError(s"Failed to execute lambda - unable to load configuration from S3"))
      }
    }

  }

  def extractXmlBodyFromJson(inputEvent: JsValue): Elem = {
    val body = (inputEvent \ "body")
    loadString(body.as[String])
  }

  /* When developing, it's best to bypass handleRequest (since this requires actually invoking the Lambda)
  and directly call cancellationAttemptForPayload.

  To do this, prepare an account in Zuora and use some test XML with a dummy output stream e.g.

  import org.apache.commons.io.output.NullOutputStream
  val testXML = <callout>
                  <parameter name="AccountId">12345</parameter>
                  <parameter name="AutoPay">true</parameter>
                </callout>
  val nullOutputStream = new NullOutputStream
  cancellationAttemptForPayload(testXML, nullOutputStream)

  The Response gets logged before we send it back to API Gateway
  */
  def cancellationAttemptForPayload(zuoraConfig: ZuoraRestConfig, xmlBody: Elem, outputStream: OutputStream): Unit = {

    val restService = new ZuoraRestService(zuoraConfig)

    parseXML(xmlBody) match {
      case -\/(response) => outputForAPIGateway(outputStream, response)
      case \/-(accountId) => autoCancellation(restService, LocalDate.now, accountId) match {
        case \/-(_) => {
          logger.info(s"Successfully processed auto-cancellation for $accountId")
          outputForAPIGateway(outputStream, successfulExecution)
        }
        case -\/(response) => {
          logger.error(s"Failed to process auto-cancellation for $accountId: ${response.body}.")
          outputForAPIGateway(outputStream, response)
        }
      }
    }
  }

  //  TODO - use JSON instead of XML now that Zuora support it
  def parseXML(xmlBody: Elem): ApiResponse \/ String = {

    val accountId = (xmlBody \ "parameter").filter { node => (node \ "@name").text == "AccountId" } // See fix me above
    val autoPay = (xmlBody \ "parameter").filter { node => (node \ "@name").text == "AutoPay" }

    if (accountId.nonEmpty && autoPay.nonEmpty) {
      logger.info(s"AccountId parsed from Zuora callout is: $accountId, AutoPay = $autoPay")
      if (autoPay.text == "true") {
        (accountId.text).right
      } else {
        noActionRequired("AutoRenew is not = true, we should not process a cancellation for this account").left
      }
    } else {
      logger.info(s"Failed to parse XML successfully, full payload was: \n $xmlBody")
      badRequest.left
    }
  }

  def autoCancellation(restService: ZuoraRestService, date: LocalDate, accountId: String): ApiResponse \/ Unit = {
    logger.info(s"Attempting to perform auto-cancellation on account: ${accountId}")
    for {
      accountSummary <- restService.getAccountSummary(accountId)
      subToCancel <- getSubscriptionToCancel(accountSummary)
      cancellationDate <- getCancellationDateFromInvoices(accountSummary, date)
      updateSubscription <- restService.updateCancellationReason(subToCancel)
      cancelSubscription <- restService.cancelSubscription(subToCancel, cancellationDate)
      disableAutoPay <- restService.disableAutoPay(accountId)
      result <- handleZuoraResults(updateSubscription, cancelSubscription, disableAutoPay)
    } yield result
  }

  def getCancellationDateFromInvoices(accountSummary: AccountSummary, dateToday: LocalDate): ApiResponse \/ LocalDate = {
    val unpaidAndOverdueInvoices = accountSummary.invoices.filter { invoice => invoiceOverdue(invoice, dateToday) }
    if (unpaidAndOverdueInvoices.isEmpty) {
      logger.error(s"Failed to find an unpaid invoice that was overdue. The invoices we got were: ${accountSummary.invoices}")
      noActionRequired("No unpaid and overdue invoices found!").left
    } else {
      logger.info(s"Found at least one unpaid invoices for account: ${accountSummary.basicInfo.id}. Invoice id(s): ${unpaidAndOverdueInvoices.map(_.id)}")
      val earliestDueDate = unpaidAndOverdueInvoices.map(_.dueDate).min
      logger.info(s"Earliest overdue invoice for account ${accountSummary.basicInfo.id} has due date: $earliestDueDate. Setting this as the cancellation date.")
      earliestDueDate.right
    }
  }

  def invoiceOverdue(invoice: Invoice, dateToday: LocalDate): Boolean = {
    if (invoice.balance > 0 && invoice.status == "Posted") {
      val zuoraGracePeriod = 14 // This needs to match with the timeframe for the 3rd payment retry attempt in Zuora
      val invoiceOverdueDate = invoice.dueDate.plusDays(zuoraGracePeriod)
      logger.info(s"Zuora grace period is: $zuoraGracePeriod days. Due date for Invoice id ${invoice.id} is ${invoice.dueDate}, so it will be considered overdue on: $invoiceOverdueDate.")
      dateToday.isEqual(invoiceOverdueDate) || dateToday.isAfter(invoiceOverdueDate)
    } else false
  }

  def getSubscriptionToCancel(accountSummary: AccountSummary): ApiResponse \/ SubscriptionSummary = {
    val activeSubs = accountSummary.subscriptions.filter(_.status == "Active")
    activeSubs match {
      case sub :: Nil => {
        logger.info(s"Determined that we should cancel SubscriptionId: ${sub.id} (for AccountId: ${accountSummary.basicInfo.id})")
        sub.right
      }
      case Nil => {
        logger.error(s"Didn't find any active subscriptions. The full list of subs for this account was: ${accountSummary.subscriptions}")
        noActionRequired("No Active subscriptions to cancel!").left
      }
      case subs => {
        // This should be a pretty rare scenario, because the Billing Account to Sub relationship is (supposed to be) 1-to-1
        logger.error(s"More than one subscription is Active on account: ${accountSummary.basicInfo.id}. Subscription ids are: ${activeSubs.map(_.id)}")
        noActionRequired("More than one active sub found!").left // Don't continue because we don't know which active sub to cancel
      }
    }
  }

  def handleZuoraResults(
    updateSubscriptionResult: UpdateSubscriptionResult,
    cancelSubscriptionResult: CancelSubscriptionResult,
    updateAccountResult: UpdateAccountResult
  ): ApiResponse \/ Unit = {
    if (!updateSubscriptionResult.success || !cancelSubscriptionResult.success || !updateAccountResult.success) {
      logger.error(s"Zuora rejected one (or more) of our calls during autoCancellation")
      internalServerError("Received at least one failure result from Zuora during autoCancellation").left
    } else {
      logger.info("All Zuora calls completed successfully")
        .right
    }
  }

}