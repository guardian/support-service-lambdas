package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.ZuoraModels._
import com.gu.autoCancel.APIGatewayResponse._
import org.joda.time.LocalDate
import java.lang.System.getenv
import java.io._
import play.api.libs.json.{ JsValue, Json }
import scala.xml.Elem
import scala.xml.XML._
import scalaz.Scalaz._
import scalaz.{ -\/, \/, \/- }

object Lambda extends App with Logging {

  /* Entry point for our Lambda - this takes the input event from API Gateway,
  extracts out the XML body and then hands over to cancellationAttemptForPayload for the 'real work'.
  */
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    logger.info(s"Auto-cancel Lambda is starting up...")
    val inputEvent = Json.parse(inputStream)
    logger.info(s"Received input event as JsValue: \n $inputEvent")
    val xmlBody = extractXmlBodyFromJson(inputEvent)
    cancellationAttemptForPayload(xmlBody, outputStream)
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
                  <parameter name="AccountID">12345</parameter>
                </callout>
  val nullOutputStream = new NullOutputStream
  cancellationAttemptForPayload(testXML, nullOutputStream)
  */
  def cancellationAttemptForPayload(xmlBody: Elem, outputStream: OutputStream): Unit = {

    val restConfig = ZuoraRestConfig(getenv("DEV_ZuoraRestUrl"), getenv("DEV_ZuoraUsername"), getenv("DEV_ZuoraPassword"))
    val restService = new ZuoraRestService(restConfig)

    parseXML(xmlBody) match {
      case -\/(e) => outputForAPIGateway(outputStream, apiGatewayFailureResponse(e))
      case \/-(accountId) => autoCancellation(restService, LocalDate.now, accountId) match {
        case \/-(_) => {
          logger.info(s"Successfully processed auto-cancellation for $accountId")
          outputForAPIGateway(outputStream, apiGatewaySuccessResponse)
        }
        case -\/(e: String) => {
          logger.error(s"Failed to process auto-cancellation for $accountId: $e.")
          outputForAPIGateway(outputStream, apiGatewayFailureResponse(e))
        }
      }
    }
  }

  def parseXML(xmlBody: Elem): String \/ String = {
    val accountId = (xmlBody \ "parameter")
    if (accountId.nonEmpty) {
      logger.info(s"AccountId parsed from Zuora callout is: $accountId")
      (accountId.text).right
    } else {
      logger.info(s"Failed to parse XML successfully, full payload was: \n $xmlBody")
      "Failure to parse XML successfully".left
    }
  }

  def autoCancellation(restService: ZuoraRestService, date: LocalDate, accountId: String): String \/ Unit = {
    logger.info(s"Attempting to perform auto-cancellation on account: ${accountId}")
    for {
      accountSummary <- restService.getAccountSummary(accountId)
      subToCancel <- getSubscriptionToCancel(accountSummary)
      invoiceToUnpost <- getInvoiceToRollBack(accountSummary, date)
      updateSubscription <- restService.updateCancellationReason(subToCancel)
      cancelSubscription <- restService.cancelSubscription(subToCancel, invoiceToUnpost.dueDate)
      unpostInvoice <- restService.unpostInvoice(invoiceToUnpost)
      result <- handleZuoraResults(updateSubscription, cancelSubscription, unpostInvoice)
    } yield result
  }

  def getOverdueUnpaidInvoices(accountSummary: AccountSummary, dateToday: LocalDate): String \/ List[Invoice] = {
    val overdueUnpaidInvoices = accountSummary.invoices.filter { invoice => invoiceOverdue(invoice, dateToday) }
    if (overdueUnpaidInvoices.isEmpty) {
      logger.error(s"Failed to find an unpaid invoice that was overdue. The invoices we got were: ${accountSummary.invoices}")
      "No unpaid and overdue invoices found!".left
    } else {
      logger.info(s"Found the following unpaid invoices: ${overdueUnpaidInvoices.map(_.id)}")
      overdueUnpaidInvoices.right
    }
  }

  def invoiceOverdue(invoice: Invoice, dateToday: LocalDate): Boolean = {
    if (invoice.balance > 0 && invoice.status == "Posted") {
      val zuoraGracePeriod = 21 // This needs to match with the timeframe for the 3rd payment retry attempt in Zuora
      val invoiceOverdueDate = invoice.dueDate.plusDays(zuoraGracePeriod)
      logger.info(s"Zuora grace period is: $zuoraGracePeriod days. Invoice due date is ${invoice.dueDate}, so it will be considered overdue on: $invoiceOverdueDate.")
      dateToday.isEqual(invoiceOverdueDate) || dateToday.isAfter(invoiceOverdueDate)
    } else false
  }

  def getInvoiceToRollBack(accountSummary: AccountSummary, dateToday: LocalDate): String \/ Invoice = {
    val unpaidInvoices = getOverdueUnpaidInvoices(accountSummary, dateToday)
    unpaidInvoices.flatMap { invoices =>
      if (invoices.size > 1) {
        logger.error(s"Found more unpaid invoices than expected for account: ${accountSummary.basicInfo.id}")
        "Multiple unpaid invoices".left
      } else {
        val invoiceToRollback = invoices.head
        logger.info(s"Determined that we should unpost InvoiceId: ${invoiceToRollback.id} (for Account Id: ${accountSummary.basicInfo.id})")
        invoiceToRollback.right
      }
    }
  }

  def getActiveSubscriptions(accountSummary: AccountSummary): String \/ List[Subscription] = {
    val activeSubs = accountSummary.subscriptions.filter(_.status == "Active")
    if (activeSubs.isEmpty) { "No Active subscriptions to cancel!".left }
    else {
      logger.info(s"Found the following active subscriptions: ${activeSubs.map(_.id)}")
      activeSubs.right
    }
  }

  def getSubscriptionToCancel(accountSummary: AccountSummary): String \/ Subscription = {
    val activeSubs = getActiveSubscriptions(accountSummary)
    activeSubs.flatMap { subs =>
      {
        if (subs.size > 1) {
          // This should be a pretty rare scenario, because the Billing Account > Sub relationship is (supposed to be) 1-to-1
          logger.error(s"More than one subscription is Active on account: ${accountSummary.basicInfo.id}. Subscription ids are: ${subs.map(_.id)}")
          "More than one active sub found!".left
        } else {
          val subToCancel = subs.head
          logger.info(s"Determined that we should cancel SubscriptionId: ${subToCancel.id} (for AccountId: ${accountSummary.basicInfo.id})")
          subToCancel.right
        }
      }
    }
  }

  def handleZuoraResults(
    updateSubscriptionResult: UpdateSubscriptionResult,
    cancelSubscriptionResult: CancelSubscriptionResult,
    updateInvoiceResult: UpdateInvoiceResult
  ): String \/ Unit = {
    if (!cancelSubscriptionResult.success || !updateInvoiceResult.success || !updateSubscriptionResult.success) {
      logger.error(s"Zuora rejected one (or more) of our calls during autoCancellation")
      "Received at least one failure result during autoCancellation".left
    } else {
      logger.info("All Zuora calls completed successfully")
        .right
    }
  }

}